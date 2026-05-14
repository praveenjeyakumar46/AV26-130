"""
Fine-tuning Script for Llama 3.2 3B Model
Purpose: Legal Answer Generation and Guidance
"""

import os
import json
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    TaskType
)
from trl import SFTTrainer

class LlamaAnswerTrainer:
    def __init__(
        self,
        model_name: str = "meta-llama/Llama-3.2-3B",
        output_dir: str = "./llama_answer_model",
        data_path: str = "./training_data/llama_answer_generation.json"
    ):
        self.model_name = model_name
        self.output_dir = output_dir
        self.data_path = data_path
        
        # Configure 4-bit quantization
        self.bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )
        
        # LoRA configuration optimized for answer generation
        self.lora_config = LoraConfig(
            r=32,  # Higher rank for better answer quality
            lora_alpha=64,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.CAUSAL_LM
        )
        
    def load_data(self):
        """Load and prepare training data"""
        with open(self.data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Convert to dataset
        dataset = Dataset.from_list(data)
        
        # Split
        split = dataset.train_test_split(test_size=0.1, seed=42)
        self.train_dataset = split['train']
        self.eval_dataset = split['test']
        
        print(f"📊 Loaded {len(self.train_dataset)} training samples")
        print(f"📊 Loaded {len(self.eval_dataset)} validation samples")
        
    def format_prompt(self, example):
        """Format training examples for Llama"""
        instruction = example['instruction']
        input_data = example['input']
        output = example['output']
        
        # Handle both dict and string inputs
        if isinstance(input_data, dict):
            question = input_data.get('question', str(input_data))
            context = input_data.get('context', '')
            input_text = f"Question: {question}\nContext: {context}"
        else:
            input_text = str(input_data)
        
        # Llama 3.2 chat format
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a legal AI assistant specializing in Indian Constitutional Law. Provide accurate, comprehensive, and helpful legal guidance based on the Constitution of India.<|eot_id|><|start_header_id|>user<|end_header_id|>

{instruction}

{input_text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

{output}<|eot_id|>"""
        
        return {"text": prompt}
    
    def load_model(self):
        """Load model and tokenizer"""
        print("🔄 Loading tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.tokenizer.pad_token = self.tokenizer.eos_token
        self.tokenizer.padding_side = "right"
        
        print("🔄 Loading model with 4-bit quantization...")
        model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            quantization_config=self.bnb_config,
            device_map="auto",
            trust_remote_code=True
        )
        
        # Prepare for training
        model = prepare_model_for_kbit_training(model)
        
        # Add LoRA adapters
        self.model = get_peft_model(model, self.lora_config)
        
        # Print trainable parameters
        self.model.print_trainable_parameters()
        
    def train(self, num_epochs: int = 3, batch_size: int = 2):
        """Train the model"""
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=num_epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            gradient_accumulation_steps=8,  # Larger for better answer quality
            learning_rate=2e-4,
            fp16=True,
            save_steps=100,
            logging_steps=10,
            evaluation_strategy="steps",
            eval_steps=50,
            save_total_limit=3,
            load_best_model_at_end=True,
            warmup_steps=100,
            group_by_length=True,
            report_to="tensorboard",
            optim="paged_adamw_8bit",
            max_grad_norm=0.3,
        )
        
        # Format datasets
        train_data = self.train_dataset.map(self.format_prompt)
        eval_data = self.eval_dataset.map(self.format_prompt)
        
        # Initialize trainer
        trainer = SFTTrainer(
            model=self.model,
            train_dataset=train_data,
            eval_dataset=eval_data,
            args=training_args,
            tokenizer=self.tokenizer,
            dataset_text_field="text",
            max_seq_length=2048,  # Longer for detailed answers
            packing=False,
        )
        
        # Train
        print("🚀 Starting training...")
        trainer.train()
        
        # Save
        print("💾 Saving model...")
        trainer.save_model()
        self.tokenizer.save_pretrained(self.output_dir)
        
        print(f"✅ Training complete! Model saved to {self.output_dir}")
        
    def test_inference(self, question: str, context: str = ""):
        """Test the trained model"""
        # Load saved model
        model = AutoModelForCausalLM.from_pretrained(
            self.output_dir,
            device_map="auto",
            torch_dtype=torch.bfloat16
        )
        tokenizer = AutoTokenizer.from_pretrained(self.output_dir)
        
        # Format prompt
        prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are a legal AI assistant specializing in Indian Constitutional Law. Provide accurate, comprehensive, and helpful legal guidance based on the Constitution of India.<|eot_id|><|start_header_id|>user<|end_header_id|>

Provide comprehensive legal guidance based on the Indian Constitution:

Question: {question}
Context: {context}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""
        
        # Generate
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        outputs = model.generate(
            **inputs,
            max_new_tokens=512,
            temperature=0.7,
            do_sample=True,
            top_p=0.95,
            repetition_penalty=1.1,
        )
        
        result = tokenizer.decode(outputs[0], skip_special_tokens=True)
        print("\n" + "="*50)
        print("TEST INFERENCE")
        print("="*50)
        print(result)
        print("="*50 + "\n")

if __name__ == "__main__":
    # Initialize trainer
    trainer = LlamaAnswerTrainer(
        model_name="meta-llama/Llama-3.2-3B",  # Change if using local path
        output_dir="./models/llama_answer_finetuned",
        data_path="./training_data/llama_answer_generation.json"
    )
    
    # Load data
    trainer.load_data()
    
    # Load model
    trainer.load_model()
    
    # Train
    trainer.train(num_epochs=3, batch_size=2)
    
    # Test
    trainer.test_inference(
        question="What is the Right to Equality?",
        context="Article 14"
    )
