# Summary Evaluation Guide

This guide explains how to evaluate your LinguaSummarize AI summaries using the `test_eval.py` script.

## Setup

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set your OpenAI API key** (deepeval uses OpenAI for evaluation):
   ```bash
   # Windows PowerShell
   $env:OPENAI_API_KEY="your-openai-api-key"
   
   # Linux/Mac
   export OPENAI_API_KEY="your-openai-api-key"
   ```

## How to Use

### Step 1: Get Your Test Data
1. Use your LinguaSummarize AI web tool to transcribe and summarize an audio file
2. Copy the **full transcript** 
3. Copy the **generated summary**

### Step 2: Update test_eval.py
Open `test_eval.py` and replace the placeholders:

```python
test_case = LLMTestCase(
    input="[Replace with your FULL transcript from the web tool]",
    actual_output="[Replace with the SUMMARY points from the web tool]"
)
```

### Step 3: Run the Evaluation
```bash
python test_eval.py
```

## What Gets Evaluated

### 1. **Coherence Score (1-5)**
- Measures how logically the summary flows
- Checks if ideas connect smoothly
- Evaluates if it reads naturally vs. just a "heap of sentences"

### 2. **Accuracy Score (1-5)**
- Verifies the summary contains ONLY facts from the transcript
- Checks for hallucinations or made-up information
- Ensures no external information was added

## Example Output

```
=== LinguaSummarize AI - Summary Evaluation ===

Evaluating Coherence...
Coherence Score: 4.5
Reasoning: The summary flows logically with clear transitions between topics...

Evaluating Accuracy...
Accuracy Score: 4.8
Reasoning: All facts are accurately derived from the transcript with no hallucinations...
```

## Tips for Best Results

1. **Test multiple samples** - Run evaluations on different types of content (meetings, lectures, songs, etc.)
2. **Compare languages** - Test your tool's performance across different target languages
3. **Track improvements** - Keep evaluation results to measure progress over time
4. **Document edge cases** - Note when scores are low and analyze why

## Troubleshooting

**"OpenAI API key not set"**
- Make sure you've exported the OPENAI_API_KEY environment variable

**Low scores consistently**
- Review your prompts in `services/geminiService.ts`
- Check if the audio quality was poor
- Ensure the transcript is complete

**Import errors**
- Run `pip install -r requirements.txt` again
- Make sure you're using Python 3.8+

## Next Steps

After evaluation, you can:
1. Update your prompts in `PROMPT_ENGINEERING_GUIDE.md`
2. Adjust the system instructions in `geminiService.ts`
3. Re-test and compare scores
4. Document improvements in `CHANGELOG_ACCURACY.md`

