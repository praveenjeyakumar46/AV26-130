"""
Evaluation Script for Legal AI Models
Measures accuracy, relevance, and quality of responses from Mistral + Qwen pipeline
"""

import json
import numpy as np
from inference_pipeline import LegalAIPipeline
from typing import List, Dict


class LegalAIEvaluator:
    def __init__(self, pipeline: LegalAIPipeline):
        self.pipeline = pipeline

    def create_test_dataset(self) -> List[Dict]:
        """Test cases covering English and Tamil queries across Constitution and Central Acts."""
        return [
            # English — Constitution
            {
                "query": "What is Article 14?",
                "expected_keywords": ["equality", "Article 14", "discrimination"],
                "expected_article": "14",
                "expected_concepts": ["right to equality", "equal protection"],
                "language": "english",
            },
            {
                "query": "Tell me about Right to Life",
                "expected_keywords": ["life", "liberty", "Article 21"],
                "expected_article": "21",
                "expected_concepts": ["personal liberty", "due process"],
                "language": "english",
            },
            {
                "query": "What are fundamental rights?",
                "expected_keywords": ["fundamental rights", "constitution", "Part III"],
                "expected_article": "12-35",
                "expected_concepts": ["enforceable rights", "justiciable"],
                "language": "english",
            },
            # English — Central Acts
            {
                "query": "What does the Hindu Marriage Act say about divorce?",
                "expected_keywords": ["marriage", "divorce", "Hindu"],
                "expected_article": "Hindu Marriage Act",
                "expected_concepts": ["dissolution", "matrimonial relief"],
                "language": "english",
            },
            # Tamil — Constitution
            {
                "query": "சமத்துவ உரிமை என்றால் என்ன?",
                "expected_keywords": ["சமத்துவம்", "உரிமை"],
                "expected_article": "14",
                "expected_concepts": ["சமத்துவம்", "பாதுகாப்பு"],
                "language": "tamil",
            },
            # Tamil — Central Acts
            {
                "query": "திருமண சட்டம் என்ன சொல்கிறது?",
                "expected_keywords": ["திருமணம்", "சட்டம்"],
                "expected_article": "Hindu Marriage Act",
                "expected_concepts": ["திருமணம்", "விவாகரத்து"],
                "language": "tamil",
            },
        ]

    # ── keyword extraction evaluation ─────────────────────────────────────────

    def evaluate_keyword_extraction(self, test_cases: List[Dict]) -> Dict:
        total_precision, total_recall = [], []
        article_matches = 0

        for case in test_cases:
            result = self.pipeline.extract_keywords(case["query"])

            predicted_article = str(result.get("article_number", result.get("source", "")))
            if (
                case["expected_article"].lower() in predicted_article.lower()
                or predicted_article.lower() in case["expected_article"].lower()
            ):
                article_matches += 1

            predicted_kw = [k.lower() for k in result.get("keywords", [])]
            expected_kw  = [k.lower() for k in case["expected_keywords"]]

            if predicted_kw:
                matches   = sum(1 for k in predicted_kw if any(e in k or k in e for e in expected_kw))
                precision = matches / len(predicted_kw)
                recall    = matches / len(expected_kw) if expected_kw else 0
                total_precision.append(precision)
                total_recall.append(recall)

        avg_p = np.mean(total_precision) if total_precision else 0
        avg_r = np.mean(total_recall)    if total_recall    else 0
        f1    = 2 * avg_p * avg_r / (avg_p + avg_r) if (avg_p + avg_r) > 0 else 0

        return {
            "article_accuracy":       article_matches / len(test_cases),
            "avg_keyword_precision":  avg_p,
            "avg_keyword_recall":     avg_r,
            "avg_f1_score":           f1,
        }

    # ── answer quality evaluation ─────────────────────────────────────────────

    def evaluate_answer_quality(self, test_cases: List[Dict]) -> Dict:
        scores = {"completeness": [], "relevance": [], "accuracy": []}

        for case in test_cases:
            keywords = self.pipeline.extract_keywords(case["query"])
            answer   = self.pipeline.generate_answer(case["query"], keywords)

            concepts_found = sum(
                1 for c in case["expected_concepts"] if c.lower() in answer.lower()
            )
            scores["completeness"].append(concepts_found / len(case["expected_concepts"]))
            scores["relevance"].append(
                1.0 if case["expected_article"].lower() in answer.lower() else 0.5
            )
            word_count = len(answer.split())
            scores["accuracy"].append(1.0 if 50 <= word_count <= 400 else 0.5)

        return {
            "avg_completeness":           np.mean(scores["completeness"]),
            "avg_relevance":              np.mean(scores["relevance"]),
            "avg_length_appropriateness": np.mean(scores["accuracy"]),
            "overall_quality":            np.mean(
                [np.mean(v) for v in scores.values()]
            ),
        }

    # ── full evaluation ───────────────────────────────────────────────────────

    def evaluate_pipeline(self) -> Dict:
        print("🔍 Starting evaluation...\n")
        test_cases = self.create_test_dataset()

        print("📊 Evaluating keyword extraction (Mistral)...")
        keyword_metrics = self.evaluate_keyword_extraction(test_cases)
        print("✅ Keyword extraction evaluation complete")
        print(json.dumps(keyword_metrics, indent=2))
        print()

        print("📊 Evaluating answer generation (Qwen)...")
        answer_metrics = self.evaluate_answer_quality(test_cases)
        print("✅ Answer generation evaluation complete")
        print(json.dumps(answer_metrics, indent=2))
        print()

        results = {
            "keyword_extraction": keyword_metrics,
            "answer_generation":  answer_metrics,
            "overall_performance": {
                "extraction_score": keyword_metrics["avg_f1_score"],
                "generation_score": answer_metrics["overall_quality"],
                "combined_score":   (
                    keyword_metrics["avg_f1_score"] + answer_metrics["overall_quality"]
                ) / 2,
            },
        }
        return results


# ── entry point ───────────────────────────────────────────────────────────────

def main():
    pipeline  = LegalAIPipeline(
        mistral_path="./models/mistral_keyword_finetuned",
        qwen_path="./models/qwen_answer_finetuned",
    )
    evaluator = LegalAIEvaluator(pipeline)
    results   = evaluator.evaluate_pipeline()

    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"\n📈 Combined Score        : {results['overall_performance']['combined_score']:.2%}")
    print(f"🔍 Keyword Extraction F1  : {results['keyword_extraction']['avg_f1_score']:.2%}")
    print(f"💡 Answer Quality Score   : {results['answer_generation']['overall_quality']:.2%}")
    print("\n" + "=" * 60 + "\n")

    with open("./evaluation_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print("✅ Evaluation complete! Results saved to evaluation_results.json")


if __name__ == "__main__":
    main()
