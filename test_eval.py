"""
Test Evaluation Script for LinguaSummarize AI
Evaluates summary quality using deepeval metrics
"""

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams, LLMTestCase


def main():
    """
    Main function for testing and evaluation
    """
    print("=== LinguaSummarize AI - Summary Evaluation ===\n")
    
    # 1. Define your Coherence Metric
    coherence_metric = GEval(
        name="Coherence",
        criteria="Coherence (1-5) - Does the summary flow logically and avoid being a 'heap' of sentences?",
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    )

    # 2. Define your Accuracy Metric
    accuracy_metric = GEval(
        name="Accuracy",
        criteria="Accuracy (1-5) - Does the summary contain ONLY facts present in the original transcript?",
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    )

    # 3. Create a Test Case
    test_case = LLMTestCase(
        input="[Paste your full audio transcript here]",
        actual_output="[Paste the summary your web tool generated here]"
    )

    # 4. Run the measure
    print("Evaluating Coherence...")
    coherence_metric.measure(test_case)
    print(f"Coherence Score: {coherence_metric.score}")
    print(f"Reasoning: {coherence_metric.reason}\n")
    
    print("Evaluating Accuracy...")
    accuracy_metric.measure(test_case)
    print(f"Accuracy Score: {accuracy_metric.score}")
    print(f"Reasoning: {accuracy_metric.reason}")


if __name__ == "__main__":
    main()

