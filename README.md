# Real-time Voice Translator - Mobile Version

![Real-time Voice Translator Mobile](images/icons/icon-192x192.png)

A progressive web application (PWA) optimized for mobile devices that provides real-time speech translation between Japanese and English. This is a mobile-optimized version of the original Real-time Voice Translator.

## Features

- **Mobile-First Design**: Fully optimized for smartphones and tablets
- **Real-time Voice Translation**: Instantly translate spoken Japanese to English or English to Japanese
- **Progressive Web App (PWA)**: Install on your home screen for app-like experience
- **Streaming Responses**: See translations appear as you speak with minimal delay
- **Language Selection**: Explicitly choose your input language for improved accuracy
- **Adjustable Font Sizes**: Multiple font size options for better readability on mobile devices
- **Offline Capability**: Install as a PWA for quick access even with limited connectivity
- **Touch-Optimized Interface**: Large buttons and touch-friendly controls

## Demo

[View Live Demo](https://your-deployment-url-here)

![App Screenshot](screenshot-mobile.png)

## Technologies Used

- **Web Speech API**: Browser-native speech recognition for real-time audio processing
- **OpenAI API**: Leverages the o3-mini model for high-quality translations
- **Fetch Streaming**: Implements streaming responses for real-time translation output
- **Progressive Web App**: Installable on iOS and Android devices
- **Responsive Design**: CSS Media Queries for optimal mobile experience

## Getting Started

### Prerequisites

- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- A modern mobile browser (Chrome, Safari, Edge)

### Installation

#### As a PWA on Mobile:

1. Open the app in Safari (iOS) or Chrome (Android)
2. iPhone/iPad: Tap Share button → "Add to Home Screen"
3. Android: Tap the menu → "Add to Home Screen" or "Install App"

#### For Development:

1. Clone this repository:
   ```bash
   git clone https://github.com/AichiroFunakoshi/voice-translator-mobile.git
   cd voice-translator-mobile
   ```

2. Set up a local HTTPS server (required for microphone access):
   
   Using Python:
   ```bash
   python3 -m http.server 8443 --ssl
   ```
   
   Or using Live Server with SSL in VS Code

3. Open your mobile browser and navigate to your local server's HTTPS URL

4. Enter your OpenAI API key when prompted on first use

### Deployment

This application can be deployed to any static hosting service:

- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- AWS S3

Remember to ensure your hosting uses HTTPS, as this is required for:
- Accessing the microphone
- PWA installation
- Service worker functionality

## Usage

1. Tap the "開始" button to start recording in Japanese
2. Tap the "Start" button to start recording in English
3. Speak clearly into your device's microphone
4. See your speech transcribed in real-time in the "Original" section
5. Watch as the translation appears in the "Translation" section
6. Tap the "Stop" button when you're finished speaking
7. Use the font size buttons (A-, A, A+, A++) to adjust text size for easier reading

## Mobile-Specific Features

- **Responsive Layout**: Buttons stack vertically on narrow screens
- **Touch-Optimized Controls**: Large tap targets for easy mobile interaction
- **Portrait Mode**: Optimized for vertical phone orientation
- **PWA Installation**: Add to home screen for full-screen experience
- **Mobile Keyboard**: Optimized input fields for mobile keyboards
- **Gesture Support**: Touch and swipe friendly interface

## Browser Compatibility

- **iOS Safari**: Full support with PWA installation
- **Chrome (Android)**: Full support with PWA installation
- **Edge (Android)**: Full support with PWA installation
- **Samsung Internet**: Full support
- **Firefox Mobile**: Limited support (no Web Speech API)

## Known Limitations

- Requires an internet connection for API access
- Translation quality depends on clear speech and good microphone input
- Limited to Japanese-English language pair
- API usage incurs costs based on usage volume
- Some older mobile browsers may not support all features

## Customization

To customize the mobile experience:

1. **Appearance**: Modify the CSS styles in `style.css`
2. **Touch Targets**: Adjust button sizes in the mobile media queries
3. **Font Sizes**: Modify the font-size classes for different reading preferences
4. **PWA Settings**: Update `manifest.json` for your app's metadata

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for providing the translation API
- Web Speech API for enabling browser-based speech recognition
- The original Real-time Voice Translator project team

## Troubleshooting

### PWA Installation Issues:
- Ensure your site is served over HTTPS
- Check that manifest.json is correctly linked
- Verify all required PWA criteria are met

### Microphone Access:
- Allow microphone permissions in browser settings
- Ensure you're accessing via HTTPS
- Try refreshing the page if permissions are denied

### Speech Recognition:
- Speak clearly and at a normal pace
- Ensure background noise is minimal
- Check your device's microphone settings

---

*Note: This application uses API services that may have usage costs. Please check the pricing details for OpenAI API before extensive use.*

For the latest updates and documentation, visit: [GitHub Repository](https://github.com/AichiroFunakoshi/voice-translator-mobile)