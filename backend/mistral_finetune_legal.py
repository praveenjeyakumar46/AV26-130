"""
Fine-tune Mistral specifically for legal keyword extraction
This will create a custom model optimized for Indian legal cases
"""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import load_dataset
import json

def format_training_prompt(example):
    """Format for Mistral instruction following"""
    return f"""[INST] {example['instruction']}

User Input:
{example['input']}

Respond with JSON only. [/INST]

{example['output']}"""

def fine_tune_mistral():
    print("🚀 Starting Mistral Fine-tuning for Legal Extraction...")
    
    # 1. Load dataset
    print("\n📚 Loading training data...")
    dataset = load_dataset('json', data_files='data/legal_extraction_train.jsonl', split='train')
    print(f"✓ Loaded {len(dataset)} training examples")
    
    # 2. Load base model
    print("\n🤖 Loading Mistral-7B-Instruct model...")
    model_name = "mistralai/Mistral-7B-Instruct-v0.2"
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        load_in_4bit=True,  # Use 4-bit quantization for efficiency
        device_map="auto",
        torch_dtype=torch.float16
    )
    
    # 3. Configure LoRA (efficient fine-tuning)
    print("\n⚙️  Configuring LoRA...")
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    
    model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    # 4. Training configuration
    training_args = TrainingArguments(
        output_dir="./data/trained_model",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        fp16=True,
        logging_steps=10,
        save_strategy="epoch",
        save_total_limit=2
    )
    
    # 5. Train
    print("\n🎯 Starting training...")
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        tokenizer=tokenizer,
        formatting_func=format_training_prompt,
        max_seq_length=2048
    )
    
    trainer.train()
    
    # 6. Save
    print("\n💾 Saving fine-tuned model...")
    trainer.save_model("./data/trained_model")
    tokenizer.save_pretrained("./data/trained_model")
    
    print("\n✅ Fine-tuning complete!")
    print("📁 Model saved to: ./data/trained_model")

if __name__ == "__main__":
    fine_tune_mistral()