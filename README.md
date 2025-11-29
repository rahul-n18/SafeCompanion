<div align="center">

# 🛡️ SafeCompanion

### *Your AI Guardian - Real-time Vision & Voice Protection*

<img src="https://raw.githubusercontent.com/yourusername/safecompanion/main/demo.gif" alt="SafeCompanion Demo" width="700"/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Try_Now-brightgreen?style=for-the-badge)](https://safecompanion.demo)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-8E75B2?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

[Features](#features) • [Demo](#demo) • [Installation](#installation) • [Usage](#usage) • [Tech Stack](#tech-stack)

</div>

---

## 🎯 What is SafeCompanion?

SafeCompanion is a **multimodal AI agent** built with React and Google's Gemini Live API that acts as a proactive guardian for **elderly individuals** and the **visually impaired**. It simultaneously processes real-time video (camera) and audio (microphone) to provide safety monitoring, navigation assistance, and companionship.


<img width="340" height="559" alt="Screenshot 2025-11-29 at 5 19 56 PM" src="https://github.com/user-attachments/assets/54834153-e0ba-4483-9bb7-a48d54b70fa8" />




**Unlike traditional chatbots**, SafeCompanion uses WebSocket streaming for continuous perception—it doesn't just respond, it actively watches and protects.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 👴 **Companion Mode** (Elderly Care)
- 🚨 **Fall Detection** with instant emergency alerts
- 💊 **Medication Tracking** with drug interaction warnings
- 💙 **Loneliness Detection** through voice analysis
- 🧠 **Long-term Memory** of family & preferences

</td>
<td width="50%">

### 👁️ **Visual Guide Mode** (Blind/Low Vision)
- 🚧 **Obstacle Detection** in real-time
- 🎧 **Spatial Audio** navigation (3D sound cues)
- 👋 **Gesture Control** (thumbs up, open palm)
- 📖 **Scene Description** & text reading

</td>
</tr>
</table>

---

## 🎬 Demo

<div align="center">
<img width="340" height="559" alt="Screenshot 2025-11-29 at 5 20 20 PM" src="https://github.com/user-attachments/assets/5491d090-b3f8-4ce9-9910-9c4528095726" />
<img width="340" height="559" alt="Screenshot 2025-11-29 at 5 20 35 PM" src="https://github.com/user-attachments/assets/f608e5d6-ac06-495d-98a7-bcefa946bc10" />
<img width="340" height="559" alt="Screenshot 2025-11-29 at 5 20 43 PM" src="https://github.com/user-attachments/assets/63b4e904-cfe3-4684-aa82-2d052c4906af" />



</div>

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Gemini API key ([Get one free](https://ai.google.dev/))
- Camera + Microphone

Clone the repo
git clone https://github.com/yourusername/safecompanion.git
cd safecompanion

Install dependencies
npm install

Set up environment
cp .env.example .env

Add your VITE_GEMINI_API_KEY to .env
Start development server
npm run dev




### Installation


Visit `http://localhost:5173` and grant camera/microphone permissions.

---

## 💡 Usage Example

**Medication Safety Check:**
User: "Can I take this?" [Shows pill bottle to camera]

AI: "That's Aspirin 81mg. I see you're taking Warfarin—
this combination increases bleeding risk.
I'm flagging this for your doctor's review."

text

**Navigation Assistance:**
AI: "Chair detected 2 feet ahead on your right."
[Audio pans to right ear]

User: [Thumbs up gesture]

AI: "Step 3 feet left to bypass. Door ahead in 5 feet."

text

---

## 🏗️ Architecture

<div align="center">

┌─────────────┐
│ Camera │──┐
│ Microphone │ │
└─────────────┘ │
▼
┌──────────────┐
│ WebSocket │
│ Stream │
└──────────────┘
│
▼
┌──────────────────┐
│ Gemini 2.5 Flash │
│ (Live API) │
└──────────────────┘
│
┌───────┴───────┐
▼ ▼
┌─────────┐ ┌──────────┐
│ Audio │ │ Tool │
│ Response│ │ Calls │
└─────────┘ └──────────┘
│ │
└───────┬───────┘
▼
┌──────────┐
│ User │
└──────────┘

text

</div>

**Key Components:**
- **Audio Pipeline**: 16kHz PCM encoding/decoding with Web Audio API
- **Video Processing**: 4 FPS JPEG compression via Canvas API
- **Function Calling**: 15+ tools (fall detection, memory, device control)
- **Spatial Audio**: StereoPannerNode for 3D navigation cues

---

## 🛠️ Tech Stack

<div align="center">

![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-4.3-646CFF?style=flat-square&logo=vite&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-8E75B2?style=flat-square&logo=google)

</div>

- **Frontend**: React + TypeScript + TailwindCSS
- **AI Model**: Google Gemini 2.5 Flash (multimodal streaming)
- **Audio**: Web Audio API, custom PCM pipeline
- **Video**: Canvas API for frame capture
- **State**: React hooks + localStorage RAG

---

## 📂 Project Structure

safecompanion/
├── src/
│ ├── components/
│ │ ├── LiveAssistant.tsx # Core WebSocket logic
│ │ ├── CompanionMode.tsx # Elderly UI
│ │ └── VisualGuideMode.tsx # Navigation UI
│ ├── services/
│ │ ├── audioUtils.ts # PCM encoding/decoding
│ │ ├── memoryService.ts # RAG-based storage
│ │ └── apiService.ts # Gemini API
│ ├── constants.ts # System prompts & tools
│ └── App.tsx # Mode router
├── .env.example
└── package.json

text

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. Fork the repo
2. Create a branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m '✨ Add AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 🔐 Privacy

- ✅ All data processed **locally** (no external database)
- ✅ Audio/video streams **not recorded**
- ✅ API keys stay on **your device**
- ✅ User controls all emergency alerts

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with [Google Gemini Live API](https://ai.google.dev/gemini-api/docs/live-guide) | Inspired by healthcare & accessibility communities

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

Made with ❤️ for those who need AI that truly cares.

</div>

