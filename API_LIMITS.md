# LinguaSummarize AI - API Limits & Constraints

This document outlines the limitations for each input method in the application.

## 📁 File Upload Limits

**Maximum File Size:** 20MB  
**Maximum Duration:** Up to 9.5 hours  
**Supported Formats:** MP3, WAV, M4A, and other common audio formats  
**Validation:** Client-side validation prevents files larger than 20MB from being uploaded

### Technical Details:
- File size check happens before upload
- Error message displays for 5 seconds if limit exceeded
- Based on Gemini API audio file constraints

---

## 🔗 Link Upload Limits

**Maximum File Size:** 20MB (for linked media)  
**Maximum Duration:** Up to 9.5 hours  
**Supported Links:**
- Direct audio links (MP3, MP4, etc.)
- Public video pages (YouTube, etc.)
- Any publicly accessible media URL

### Technical Details:
- AI uses Google Search to extract content from links
- Link content must be publicly accessible
- No authentication-protected content

---

## 🎙️ Live Recording Limits

**Maximum Session Duration:** 60 minutes per recording session  
**Audio Quality:** 16kHz sample rate  
**Real-time Processing:** Live transcription with WebSocket connection  

### Technical Details:
- Uses Gemini 2.5 Flash Native Audio Preview model
- Live transcription updates in real-time
- Summary generated automatically when recording stops
- Session timeout after 60 minutes of inactivity

---

## 📊 General API Constraints

### Gemini API Quotas:
- Free tier: 15 requests per minute (RPM)
- Free tier: 1 million tokens per day
- Paid tier: Higher limits available

### Best Practices:
1. **Optimize file sizes** - Compress audio when possible
2. **Use appropriate formats** - MP3 is generally smaller than WAV
3. **Break long content** - For content over 9 hours, split into multiple files
4. **Monitor usage** - Check your API quota in Google AI Studio

---

## 🌍 Language Support

All limits apply equally across all supported languages:
- English
- Cantonese (廣東話)
- Mandarin/Chinese (中文)
- German (Deutsch)
- Japanese (日本語)

---

## ⚠️ Error Handling

### File Too Large:
- Error displayed: "File too large! Maximum size: 20MB"
- Solution: Compress audio or split into smaller files

### Duration Too Long:
- Gemini API will process but may take longer
- Consider splitting very long recordings

### Network Issues:
- Retry mechanism built-in
- Check internet connection
- Verify API key is valid

---

## 🔄 Updates

Last Updated: December 24, 2025

For the latest API limits, visit:
- [Google AI Studio](https://aistudio.google.com)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)

