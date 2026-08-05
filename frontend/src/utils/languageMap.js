// src/utils/languageMap.js

export const SENTENCE_MAP = {
  ASK: {
    english: "I want to ask something",
    telugu: "నాకు ఒక విషయం అడగాలి అని ఉంది",
    hindi: "मुझे कुछ पूछना है ऐसा लग रहा है",
    tamil: "எனக்கு ஒரு விஷயம் கேட்க வேண்டும் என்று தோன்றுகிறது",
    kannada: "ನನಗೆ ಒಂದು ವಿಷಯ ಕೇಳಬೇಕು ಅನ್ನಿಸುತ್ತದೆ"
  },

  BATHROOM: {
    english: "I need to go to the bathroom",
    telugu: "నాకు బాత్రూమ్ వెళ్లాలి అని ఉంది",
    hindi: "मुझे बाथरूम जाना है ऐसा लग रहा है",
    tamil: "எனக்கு கழிவறைக்கு செல்ல வேண்டும் என்று தோன்றுகிறது",
    kannada: "ನನಗೆ ಬಾತ್‌ರೂಮ್ ಹೋಗಬೇಕು ಅನ್ನಿಸುತ್ತದೆ"
  },

  EATING: {
    english: "I feel like eating",
    telugu: "నాకు తినాలి అని ఉంది",
    hindi: "मुझे खाना है ऐसा लग रहा है",
    tamil: "எனக்கு சாப்பிட வேண்டும் என்று தோன்றுகிறது",
    kannada: "ನನಗೆ ತಿನ್ನಬೇಕು ಅನ್ನಿಸುತ್ತದೆ"
  },

  ME: {
    english: "Me",
    telugu: "నేను",
    hindi: "मैं",
    tamil: "நான்",
    kannada: "ನಾನು"
  },

  MEDICINE: {
    english: "I need medicine",
    telugu: "నాకు మందు కావాలి అని ఉంది",
    hindi: "मुझे दवा चाहिए ऐसा लग रहा है",
    tamil: "எனக்கு மருந்து வேண்டும் என்று தோன்றுகிறது",
    kannada: "ನನಗೆ ಔಷಧಿ ಬೇಕು ಅನ್ನಿಸುತ್ತದೆ"
  },

  NO: {
    english: "No",
    telugu: "కాదు",
    hindi: "नहीं",
    tamil: "இல்லை",
    kannada: "ಇಲ್ಲ"
  },

  PAIN: {
    english: "I am in pain",
    telugu: "నాకు నొప్పి ఉంది అని ఉంది",
    hindi: "मुझे दर्द हो रहा है ऐसा लग रहा है",
    tamil: "எனக்கு வலி உள்ளது என்று தோன்றுகிறது",
    kannada: "ನನಗೆ ನೋವು ಇದೆ ಅನ್ನಿಸುತ್ತದೆ"
  },

  THANKYOU: {
    english: "Thank you",
    telugu: "ధన్యవాదాలు",
    hindi: "धन्यवाद",
    tamil: "நன்றி",
    kannada: "ಧನ್ಯವಾದಗಳು"
  },

  WATER: {
    english: "I need water",
    telugu: "నాకు నీరు కావాలి అని ఉంది",
    hindi: "मुझे पानी चाहिए ऐसा लग रहा है",
    tamil: "எனக்கு தண்ணீர் வேண்டும் என்று தோன்றுகிறது",
    kannada: "ನನಗೆ ನೀರು ಬೇಕು ಅನ್ನಿಸುತ್ತದೆ"
  },

  YES: {
    english: "Yes",
    telugu: "అవును",
    hindi: "हाँ",
    tamil: "ஆம்",
    kannada: "ಹೌದು"
  },

  YOU: {
    english: "You",
    telugu: "నీవు",
    hindi: "तुम",
    tamil: "நீ",
    kannada: "ನೀನು"
  }
};

export function getSentence(gesture, language = "english") {
  if (!gesture) return "";
  const key = gesture.toUpperCase();
  if (!SENTENCE_MAP[key]) return gesture;
  return SENTENCE_MAP[key][language] || SENTENCE_MAP[key].english;
}
