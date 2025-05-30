# SmartSort

**SmartSort** is a Spicetify extension that allows you to sort and filter your Spotify playlists or liked songs using the power of AI. Just type a theme like `"sad"`, `"Japanese"`, or `"gym"`—and SmartSort will reorder your playlist accordingly using OpenAI's GPT model.

Created by **Tonphon**.  
Built using [Spicetify Creator](https://github.com/spicetify/spicetify-creator).

---

## Features

- Prompt-based sorting — just type any theme
- Powered by OpenAI GPT models
- Choose between **Sort** or **Sort and Filter**
- Works on both **playlists** and **Liked Songs**
- Configurable settings for API key and model
- Clean UI, seamlessly integrated into Spotify

---

## Installation

1. Open [Spicetify Marketplace](https://marketplace.spicetify.app).
2. Search for `SmartSort` or browse in the Extensions section.
3. Click **Install**.
4. Go to any playlist or liked songs and look for the prompt bar at the top.

---

## Settings

SmartSort provides a settings section where you can:

- Input your **OpenAI API Key**
- Select your **preferred GPT model** (e.g., `gpt-4o`, `gpt-4`, `gpt-3.5-turbo`)

If no API key is provided, SmartSort will fall back to a shared proxy server (rate-limited).  
To unlock full access and performance, it's recommended to use your own key.

### Settings UI Example

![SmartSort Settings Screenshot](./settings.png)

---

## Demo

Watch SmartSort in action in this short demo:  
[▶Demo Video](./demo.gif)

---

## Modes

| Mode             | Description                                                              |
|------------------|---------------------------------------------------------------------------|
| Sort             | Assigns a score from 1–100 to each track based on the prompt              |
| Sort and Filter  | Assigns a score from 0–100; tracks with a score of 0 will be removed      |

---

## Notes

- You must be logged into Spotify via the desktop app with Spicetify enabled.
- All new playlists are created privately and named with your prompt (e.g., `Chill Vibes (sad)`).
- For best results, use prompts in English and keep them concise.


