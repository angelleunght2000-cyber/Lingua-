# Prompt Engineering Guide for LinguaSummarize AI

## 🎯 Problem: Inaccurate Song/Artist Detection

**Original Issue:** The AI correctly transcribes song lyrics but incorrectly identifies the singer and song name.

**Root Cause:** Generic prompts without specific instructions for handling music led to AI "guessing" artist/song information.

---

## ✅ Solution: Enhanced Prompt Engineering

### Key Improvements Made:

#### 1. **Explicit Conservative Instructions**
```
- BE VERY CONSERVATIVE: Only provide artist/song name if you are HIGHLY CONFIDENT
- If uncertain, prefer "Unknown" over incorrect information
- DO NOT guess or make assumptions
- Accuracy over completeness
```

#### 2. **Better Classification System**
Added specific category for music:
- "Music/Song" (new)
- "Meeting"
- "Lecture"
- "Interview"
- "Podcast"
- "Memo/Voice Note"
- "Presentation"
- "Conversation"
- "Other"

#### 3. **Structured Artist Information**
- New optional field: `artistInfo`
- Format: "Artist Name - Song Title" or "Unknown - Unknown"
- Only populated for music/songs
- Defaults to "Unknown - Unknown" when uncertain

#### 4. **Context-Specific Summaries**
**For Music/Songs:**
- Genre identification
- Mood/emotion
- Key lyrical themes
- Language of lyrics
- Notable musical elements

**For Other Content:**
- Main topics
- Key decisions
- Action items
- Important quotes

---

## 🧠 Prompt Engineering Best Practices

### 1. **Be Explicit and Specific**
❌ Bad: "Identify the song"
✅ Good: "ONLY identify the song if you can CONFIDENTLY determine both artist and title. If uncertain, return 'Unknown - Unknown'"

### 2. **Prioritize Accuracy Over Completeness**
❌ Bad: "Provide artist and song name"
✅ Good: "It's better to return 'Unknown' than to guess incorrectly"

### 3. **Use Clear Formatting Instructions**
❌ Bad: "Give me the artist and song"
✅ Good: "Format: 'Artist Name - Song Title'"

### 4. **Provide Decision Guidelines**
❌ Bad: "Classify the audio"
✅ Good: "If it's music/song, classify as 'Music/Song'. For speech content, choose from: Meeting, Lecture, Interview..."

### 5. **Use Emphasis Strategically**
- **CAPITAL LETTERS** for critical instructions
- **Bold formatting** in structured prompts
- Repeat important constraints

### 6. **Structure Prompts with Hierarchy**
```
1. Main Task
   - Sub-instruction A
   - Sub-instruction B
2. Next Task
   - Sub-instruction C
```

### 7. **Add Validation Rules**
```
CRITICAL RULES:
- Rule 1
- Rule 2
- Rule 3
```

---

## 📊 Before vs After Comparison

### Before (Generic Prompt):
```javascript
const prompt = `
  Transcribe the audio.
  Classification: Categorize the audio.
  Title: Create a short title.
  Summary: Provide bullet points.
`;
```

**Problem:**
- AI made assumptions
- No guidance on uncertainty handling
- Guessed artist/song names incorrectly

### After (Enhanced Prompt):
```javascript
const prompt = `
  You are an expert multilingual transcriber and audio analyst.
  
  1. TRANSCRIBE with 100% accuracy...
  
  2. CLASSIFY accurately:
     - Options: "Music/Song", "Meeting", ...
     - If it's music/song, classify as "Music/Song"
  
  3. IDENTIFY Artist & Song (ONLY if music/song):
     - BE VERY CONSERVATIVE
     - Only provide if HIGHLY CONFIDENT
     - If uncertain, set to "Unknown"
     - DO NOT guess
  
  CRITICAL RULES:
  - Accuracy over completeness
  - Better to say "Unknown" than guess incorrectly
`;
```

**Improvements:**
- Clear decision framework
- Conservative approach to uncertain information
- Structured output format
- Explicit handling of edge cases

---

## 🎵 Music Detection Strategy

### How It Works Now:

1. **Classify First:** AI determines if content is music/song
2. **Conservative Identification:** Only attempts artist/song ID if highly confident
3. **Fallback to Unknown:** Uses "Unknown - Unknown" for uncertain cases
4. **Lyric Analysis:** Focuses on accurate transcription of lyrics
5. **Contextual Summary:** Provides genre, mood, themes instead of guessing metadata

### When Artist/Song IS Identified:
- Artist explicitly mentioned in audio
- Song title stated clearly
- Recognizable commercial recording
- High confidence match

### When "Unknown" Is Used:
- Cover versions
- Amateur recordings
- Unclear audio quality
- No explicit artist/song mention
- AI uncertainty threshold not met

---

## 🔧 Advanced Customization Options

### Adjust Confidence Threshold

**More Conservative (Fewer false positives):**
```javascript
- ONLY identify if you are 99% CERTAIN
- Prefer "Unknown" unless absolutely confident
- Require explicit mention of artist AND song
```

**More Permissive (More attempts, but risk false positives):**
```javascript
- Identify if you are reasonably confident (70%+)
- Make educated guesses based on lyric style
- Use contextual clues
```

### Add Additional Metadata

You can enhance the schema to include:
```javascript
properties: {
  artistInfo: { type: Type.STRING },
  genre: { type: Type.STRING },
  language: { type: Type.STRING },
  mood: { type: Type.STRING },
  instrumentsDetected: { type: Type.ARRAY, items: { type: Type.STRING } }
}
```

### Domain-Specific Prompts

**For Podcast Analysis:**
```javascript
const prompt = `
  You are analyzing a podcast.
  Focus on:
  - Host names (if mentioned)
  - Guest names (if mentioned)
  - Episode topic
  - Key discussion points
`;
```

**For Meeting Transcription:**
```javascript
const prompt = `
  You are transcribing a business meeting.
  Extract:
  - Attendees (if mentioned)
  - Decisions made
  - Action items with ownership
  - Follow-up dates
`;
```

---

## 📈 Testing & Validation

### Test Cases to Verify Improvements:

1. **Known Song Test:**
   - Upload a popular song where artist says their name
   - Expected: Correct artist/song identification

2. **Cover Song Test:**
   - Upload a cover version or amateur performance
   - Expected: "Unknown - Unknown" (unless explicitly stated)

3. **Instrumental Music Test:**
   - Upload instrumental music (no lyrics)
   - Expected: Classification as "Music/Song", "Unknown - Unknown"

4. **Speech Content Test:**
   - Upload a meeting or lecture
   - Expected: Appropriate non-music classification

5. **Multilingual Song Test:**
   - Upload songs in German/Japanese/Chinese
   - Expected: Accurate transcription in original language

---

## 💡 Additional Tips

### 1. **Iterative Refinement**
- Test with real-world samples
- Identify patterns in errors
- Add specific instructions for edge cases
- Refine prompts based on user feedback

### 2. **Use Examples in Prompts** (Few-Shot Learning)
```javascript
Example of good output:
{
  "artistInfo": "Taylor Swift - Shake It Off",
  "classification": "Music/Song"
}

Example when uncertain:
{
  "artistInfo": "Unknown - Unknown",
  "classification": "Music/Song"
}
```

### 3. **Temperature Settings**
- Lower temperature (0.1-0.3) = More deterministic, conservative
- Higher temperature (0.7-0.9) = More creative, but less consistent
- For accuracy, prefer lower temperature

### 4. **Prompt Versioning**
Keep track of prompt versions and their performance:
```
v1.0 - Generic prompt (50% accuracy on songs)
v2.0 - Added conservative instructions (75% accuracy)
v3.0 - Added structured output (85% accuracy)
```

### 5. **User Feedback Loop**
- Allow users to correct wrong artist/song info
- Log corrections to identify patterns
- Update prompts based on common errors

---

## 🚀 Expected Results

With these improvements, you should see:

✅ **Reduced False Positives:** Fewer incorrect artist/song identifications  
✅ **Increased Precision:** When artist/song IS identified, it's more likely correct  
✅ **Better User Trust:** "Unknown" is honest and builds confidence  
✅ **Consistent Behavior:** Predictable output format  
✅ **Accurate Transcription:** Lyrics still transcribed perfectly regardless of metadata  

---

## 📞 When to Adjust Prompts Further

Consider refining prompts if you notice:
- Specific types of errors occurring frequently
- Certain languages performing poorly
- Particular audio types being misclassified
- Users consistently needing to correct the same fields

---

## 🔗 Resources

- [Google Gemini Prompt Design](https://ai.google.dev/gemini-api/docs/prompting-intro)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Best Practices for AI Prompts](https://platform.openai.com/docs/guides/prompt-engineering)

---

**Last Updated:** December 24, 2025  
**Version:** 2.0 (Conservative Music Detection)



