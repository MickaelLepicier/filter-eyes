# 👁️ Filter Eyes Effect Project 

A real-time face and eye tracking project using MediaPipe Face Mesh
and HTML Canvas to apply visual effects on the eyes.

---

## ✨ What Does This Filter Eyes Do?

- Detects a human face in real-time using the camera
- Tracks eye movement and eyelid openness
- Detects blinking and partial eye closure
- Applies color filters, masks, and visual effects on the eyes
- Uses MediaPipe Face Mesh for high-precision landmark detection

---

## 🛠 Technologies Used

This project is built with:

- JavaScript
- HTML
- CSS
- Canvas API
- MediaPipe Face Mesh

---

## 🎯 Project Goal

To learn and experiment with:

- Real-time face detection

- Eye tracking

- Blink detection

- Canvas-based rendering

- 3D face landmark models

---

## 🧠 Key Features

- 468 facial landmarks tracking

- Eyelid open/close detection

- Real-time iris and eye movement tracking

- Smart eye masking and clipping

- Clean visual effects without unwanted shadows

---

## 🧪 Project Status

- ✔ Active development
- ⚙ Some visual effects are still being optimized
- 🛠 Ongoing experiments with masks and blend modes

---

## 🧠 JavaScript Structure (High Level)

The JavaScript code is organized into clear logical stages:

### 1️⃣ Camera & MediaPipe Setup
- Initializes the webcam.
- Loads the MediaPipe Face Mesh model.
- Receives face landmarks on every frame.

### 2️⃣ Canvas Render Layers
The rendering is built from multiple offscreen canvas layers:

- eyeColorLayer – draws the base iris color.
- eyeShadeLayer – adds light, depth and realism.
- eyeMaskLayer – defines where the color is visible.
- eyeCutLayer – removes color when the eyelid closes.
- eyeMaskFeather – softens mask edges.
- eyeCutFeather – softens eyelid clipping.

### 3️⃣ Blink & Eyelid Detection
- Uses face landmarks to detect eyelid movement.
- Calculates how open or closed each eye is.
- When the eye closes, the color is clipped.

### 4️⃣ Rendering Pipeline
1. The iris color is drawn.
2. Shading and lighting are added.
3. The eye mask is applied.
4. The eyelid cutout removes hidden areas.
5. The final eye result is rendered to the main canvas.

### 5️⃣ UI & Controls
- Color picker for iris selection.
- Camera start/stop controls.
- Floating palette and capture buttons.

### 6️⃣ Main Loop
- Each camera frame is processed.
- Face landmarks are updated.
- Eye masks are rebuilt.
- The final image is rendered.
---

## 🚀 Getting Started

1. Download the code
1. Open the folder with VSCode
2. Install Live Server extension
3. In VSCode right click on main.html
4. Click on "Open With Live Server"

---

## 👥 Developed by
Nir Amram and Mickael Lepicier

Powered by MediaPipe Face Mesh.
