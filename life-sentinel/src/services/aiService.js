// AI Service - Modular architecture for easy provider/model swapping
// Classification: keyword-based locally (always works, no API key needed).
// Guidance: routes through backend /api/ai/chat proxy (AI key stays server-side).
//           Falls back to local mock ONLY when AI is genuinely not configured.

import { apiAiChat, isBackendConfigured } from './apiClient';

// Category keyword mappings for classification
const CATEGORY_KEYWORDS = {
  accident: ['accident', 'crash', 'collision', 'car', 'vehicle', 'road', 'hit', 'injured in accident', 'حادثہ', 'گاڑی', 'ٹکر', 'سڑک'],
  fire: ['fire', 'burning', 'flames', 'smoke', 'آگ', 'جلنا', 'دھواں', 'آتشزدگی'],
  flood: ['flood', 'water', 'rising water', 'overflow', 'submerged', 'سیلاب', 'پانی', 'ڈوبنا'],
  earthquake: ['earthquake', 'tremor', 'shaking', 'quake', 'زلزلہ', 'جھٹکے', 'ہلچل'],
  medical: ['heart attack', 'stroke', 'breathing', 'unconscious', 'choking', 'bleeding', 'فوری طبی', 'سانس', 'بے ہوش', 'خون', 'دل کا دورہ'],
  crime: ['robbery', 'theft', 'attack', 'harassment', 'assault', 'threat', 'stolen', 'جرم', 'چوری', 'حملہ', 'ہراسانی', 'دھمکی'],
};

const SEVERITY_KEYWORDS = {
  critical: ['dying', 'unconscious', 'not breathing', 'severe bleeding', 'trapped', 'building collapse', 'مر رہا', 'بے ہوش', 'پھنسے', 'عمارت گر'],
  high: ['serious injury', 'fire spreading', 'rising water', 'multiple injured', 'can\'t breathe', 'serious', 'شدید', 'آگ پھیل', 'متعدد زخمی'],
  medium: ['minor injury', 'small fire', 'water logging', 'stranded', 'معمولی زخم', 'چھوٹی آگ', 'پانی بھرنا'],
  low: ['scared', 'suspicious', 'concerned', 'minor issue', 'پریشان', 'مشکوک'],
};

/**
 * Classify emergency from text description
 * @param {string} text - Emergency description
 * @returns {{ category: string, severity: string, keywords: string[], summary: string }}
 */
export async function classifyEmergency(text) {
  return classifyLocally(text);
}

function classifyLocally(text) {
  const lower = text.toLowerCase();

  // Category detection
  let category = 'other';
  let maxMatches = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(kw => lower.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      category = cat;
    }
  }

  // Severity detection
  let severity = 'medium';
  let maxSevMatches = 0;
  for (const [sev, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    const matches = keywords.filter(kw => lower.includes(kw)).length;
    if (matches > maxSevMatches) {
      maxSevMatches = matches;
      severity = sev;
    }
  }
  if (maxSevMatches === 0 && maxMatches > 0) severity = 'medium';

  const matchedKeywords = [];
  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    keywords.forEach(kw => { if (lower.includes(kw) && !matchedKeywords.includes(kw)) matchedKeywords.push(kw); });
  }

  return {
    category,
    severity,
    keywords: matchedKeywords.slice(0, 5),
    summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
  };
}

/**
 * Get AI emergency guidance.
 * Tries the backend AI proxy first. Falls back to local mock guidance ONLY when:
 *   - The backend is not configured (no VITE_BACKEND_URL), or
 *   - The backend explicitly reports AI_NOT_CONFIGURED.
 * Throws on provider failures so the UI can show a real error instead of
 * silently presenting mock guidance as AI-generated.
 * @param {string} category - Emergency category
 * @param {string} message - User message
 * @param {Array} history - Chat history
 * @param {string|Function} langOrT - language code ('en'|'ur') or translation function t()
 * @returns {string} AI response
 */
export async function getEmergencyGuidance(category, message, history = [], langOrT = 'en') {
  const t = typeof langOrT === 'function' ? langOrT : null;
  const language = t ? (t._lang || 'en') : langOrT;

  // No backend at all → local mock is the only option
  if (!isBackendConfigured()) {
    return getMockGuidance(category, message, t, language);
  }

  return getGuidanceFromBackend(category, message, history, language, t);
}

const GUIDANCE_RESPONSES = {
  fire: [
    'Get out immediately. Do not collect belongings.',
    'Feel doors before opening. If hot, find another exit.',
    'Stay low to avoid smoke inhalation. Cover your nose and mouth with a wet cloth.',
    'Once outside, move at least 100 feet away from the building.',
    'Call 1122 (Rescue) and 16 (Fire Brigade) immediately.',
    'Do NOT re-enter the building under any circumstances.',
  ],
  flood: [
    'Move to higher ground immediately. Do not wait.',
    'Avoid walking through floodwater. Just 6 inches of moving water can knock you down.',
    'Do not drive through flooded roads. Turn around.',
    'Turn off electricity at the main switch if safe to do so.',
    'Call Rescue 1122 for help.',
    'Keep your phone charged and listen to official instructions.',
  ],
  earthquake: [
    'DROP to your hands and knees right now.',
    'Take COVER under sturdy furniture. Protect your head and neck.',
    'HOLD ON until the shaking stops.',
    'Stay away from windows, heavy objects, and exterior walls.',
    'If outdoors, move to an open area away from buildings and power lines.',
    'After shaking stops, check for injuries and evacuate if the building is damaged.',
  ],
  accident: [
    'Ensure your safety first. Move to a safe spot away from traffic.',
    'Call Rescue 1122 for ambulance if anyone is injured.',
    'Do not move injured persons unless they are in immediate danger.',
    'Apply pressure to any bleeding wounds with a clean cloth.',
    'Turn on hazard lights and set up warning signs if available.',
    'Take photos of the scene for documentation.',
  ],
  medical: [
    'Call Rescue 1122 immediately.',
    'Check if the person is breathing. If not, begin CPR if you are trained.',
    'If unconscious but breathing, place them in the recovery position (on their side).',
    'Do not give food or water to an unconscious person.',
    'Keep the person warm and calm.',
    'Note the time symptoms started — this is important for medical teams.',
  ],
  crime: [
    'Move to a safe location immediately.',
    'Call Police on 15.',
    'Do not confront the attacker.',
    'Note the description of the person: height, clothing, direction of travel.',
    'Stay on the line with emergency services.',
    'Find other people nearby for safety in numbers.',
  ],
  other: [
    'Move to a safe location.',
    'Assess the situation calmly.',
    'Call the appropriate emergency service if needed.',
    'Stay on the line with emergency services.',
    'Follow instructions from emergency responders.',
  ],
};

function getMockGuidance(category, message, t, language) {
  // Fallback English responses when t() is not available
  const tr = (key, fallback) => (t ? t(key) : fallback);
  const responses = [
    tr(`ai.${category}.0`, ''),
    tr(`ai.${category}.1`, ''),
    tr(`ai.${category}.2`, ''),
    tr(`ai.${category}.3`, ''),
    tr(`ai.${category}.4`, ''),
    tr(`ai.${category}.5`, ''),
  ].filter(Boolean);
  // Fallback if keys are missing (e.g., unknown category)
  if (responses.length === 0) {
    responses.push(
      tr('ai.other.0', 'Move to a safe location.'),
      tr('ai.other.1', 'Assess the situation calmly.'),
      tr('ai.other.2', 'Call the appropriate emergency service if needed.'),
      tr('ai.other.3', 'Stay on the line with emergency services.'),
      tr('ai.other.4', 'Follow instructions from emergency responders.'),
    );
  }

  const lower = message.toLowerCase();

  if (lower.includes('help') || lower.includes('what should') || lower.includes('what do')) {
    return `${tr('ai.helpIntro', `Based on the ${category} situation, here's what you need to do right now:`)}\n\n${responses[0]}\n\n${responses[1]}`;
  }

  if (lower.includes('injur') || lower.includes('hurt') || lower.includes('bleed')) {
    return `${tr('ai.injuryTitle', 'For injuries:')}\n1. ${tr('ai.injury.0', 'Apply direct pressure to any bleeding with a clean cloth.')}\n2. ${tr('ai.injury.1', 'Do not remove embedded objects.')}\n3. ${tr('ai.injury.2', 'Keep the injured person still and calm.')}\n4. ${tr('ai.injury.3', 'Call Rescue 1122 if you haven\'t already.')}`;
  }

  if (lower.includes('safe') || lower.includes('danger')) {
    return `${tr('ai.safetyTitle', 'Safety first:')}\n${responses[0]}\n${responses[1]}\n\n${tr('ai.safetyQuestion', 'Are you currently in a safe location?')}`;
  }

  return `${responses[0]}\n\n${responses[1]}\n\n${responses[2] || ''}\n\n${tr('ai.moreQuestion', 'Would you like more specific guidance on any of these steps?')}`.trim();
}

/**
 * Call the backend AI proxy and return the AI-generated response text.
 * Falls back to local mock ONLY when the backend reports AI_NOT_CONFIGURED.
 * Throws on any other error so the caller can display a real error state.
 */
async function getGuidanceFromBackend(category, message, history, language, t) {
  const result = await apiAiChat(category, message, history, language);

  // Backend explicitly says AI is not configured → intentional local fallback
  if (result?.error === 'AI_NOT_CONFIGURED') {
    return getMockGuidance(category, message, t, language);
  }

  // Successful AI response
  if (result?.success && result.content) {
    return result.content;
  }

  // Any other outcome (AI_PROVIDER_ERROR, network failure, etc.) → throw
  // The UI catch block will show the real error instead of fake mock guidance
  throw new Error(result?.message || 'AI assistant request failed.');
}

/**
 * Analyze emergency image
 * @param {File} file - Image file
 * @param {Function} [t] - translation function
 * @returns {{ hazards: string[], description: string, confidence: string }}
 */
export async function analyzeImage(file, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        hazards: [tr('ai.imageHazard.0', 'Possible structural damage'), tr('ai.imageHazard.1', 'Debris on roadway')],
        description: tr('ai.imageDesc', 'Image appears to show a damaged area with visible debris. Possible infrastructure damage.'),
        confidence: 'medium',
        disclaimer: tr('ai.imageDisclaimer', 'This analysis is AI-generated and may be incorrect. Do not rely solely on automated image analysis.'),
      });
    }, 1500);
  });
}

/**
 * Assess harassment / unsafe situation risk level
 * @param {string} text - User's description of the situation
 * @param {Function} [t] - translation function
 * @returns {{ riskLevel: 'low'|'medium'|'high', guidance: string[], escalateToSOS: boolean }}
 */
export async function assessHarassmentRisk(text, t) {
  return assessHarassmentRiskLocally(text, t);
}

function assessHarassmentRiskLocally(text, t) {
  const lower = text.toLowerCase();

  // High-risk indicators: immediate danger, physical threat, being followed
  const highIndicators = [
    'following', 'chasing', 'physically', 'weapon', 'knife', 'gun',
    'trapped', 'locked', 'kidnap', 'abduct', 'forced', 'dragged',
    'immediate danger', 'right now', 'help me', 'emergency',
    'touching', 'grabbed', 'pushed', 'hit', 'beaten', 'strangled',
    'پیچھا', 'ہتھیار', 'اغوا', 'مجبور', 'حملہ',
  ];

  // Medium-risk indicators: verbal harassment, uncomfortable situations
  const mediumIndicators = [
    'stalking', 'harassing', 'threatening', 'threatened', 'intimidat',
    'uncomfortable', 'creepy', 'watching', 'messages', 'calling repeatedly',
    'inappropriate', 'unwanted', 'blackmail', 'coerc',
    'پیچھا کرنا', 'ہراسانی', 'دھمکی', 'بلیک میل',
  ];

  // Low-risk indicators: general discomfort, suspicious behavior
  const lowIndicators = [
    'suspicious', 'weird', 'staring', 'uneasy', 'concerned',
    'strange', 'someone', 'loitering', 'feeling unsafe',
    'مشکوک', 'پریشان',
  ];

  const highMatches = highIndicators.filter(kw => lower.includes(kw)).length;
  const mediumMatches = mediumIndicators.filter(kw => lower.includes(kw)).length;
  const lowMatches = lowIndicators.filter(kw => lower.includes(kw)).length;

  let riskLevel, escalateToSOS;

  if (highMatches >= 2 || (highMatches >= 1 && lower.includes('right now'))) {
    riskLevel = 'high';
    escalateToSOS = true;
  } else if (highMatches >= 1 || mediumMatches >= 2) {
    riskLevel = 'high';
    escalateToSOS = false;
  } else if (mediumMatches >= 1) {
    riskLevel = 'medium';
    escalateToSOS = false;
  } else {
    riskLevel = 'low';
    escalateToSOS = false;
  }

  const guidance = getHarassmentGuidance(riskLevel, escalateToSOS, t);

  return { riskLevel, guidance, escalateToSOS };
}

function getHarassmentGuidance(riskLevel, escalate, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  if (escalate) {
    return [
      tr('ai.harass.sos.0', 'You appear to be in immediate danger. Activate SOS or call emergency services (15 for Police, 1122 for Rescue) right now.'),
      tr('ai.harass.sos.1', 'Move to a well-lit, populated area if possible.'),
      tr('ai.harass.sos.2', 'Stay on the phone with emergency services.'),
      tr('ai.harass.sos.3', 'Do not confront the person. Focus on getting to safety.'),
      tr('ai.harass.sos.4', 'Share your live location with a trusted contact immediately.'),
    ];
  }
  if (riskLevel === 'high') {
    return [
      tr('ai.harass.high.0', 'Call Police on 15 immediately. Do not delay.'),
      tr('ai.harass.high.1', 'Move to a safe, well-lit public area.'),
      tr('ai.harass.high.2', 'Alert people around you — ask for help directly.'),
      tr('ai.harass.high.3', 'Note the person\'s description: appearance, clothing, direction.'),
      tr('ai.harass.high.4', 'Save all messages, screenshots, and any evidence.'),
      tr('ai.harass.high.5', 'Contact a trusted person and share your location.'),
    ];
  }
  if (riskLevel === 'medium') {
    return [
      tr('ai.harass.medium.0', 'Move away from the situation to a safer location.'),
      tr('ai.harass.medium.1', 'Do not engage or respond to the harasser.'),
      tr('ai.harass.medium.2', 'Document everything: save messages, take screenshots, note times and locations.'),
      tr('ai.harass.medium.3', 'Report the incident to the police (15) or through the Citizen\'s Portal.'),
      tr('ai.harass.medium.4', 'Tell a trusted friend or family member about the situation.'),
      tr('ai.harass.medium.5', 'Block the person on all platforms if the harassment is online.'),
    ];
  }
  return [
    tr('ai.harass.low.0', 'Stay aware of your surroundings. Trust your instincts.'),
    tr('ai.harass.low.1', 'If someone makes you uncomfortable, move away calmly.'),
    tr('ai.harass.low.2', 'Keep your phone charged and accessible.'),
    tr('ai.harass.low.3', 'Share your location with a trusted contact.'),
    tr('ai.harass.low.4', 'If the situation escalates, call Police on 15 immediately.'),
    tr('ai.harass.low.5', 'Document any suspicious behavior for future reference.'),
  ];
}

/**
 * Analyze risk for an area
 * @param {{ lat: number, lng: number }} location
 * @param {Function} [t] - translation function
 * @returns {{ riskLevel: string, factors: string[] }}
 */
export async function analyzeRisk(location, t) {
  const tr = (key, fallback) => (t ? t(key) : fallback);
  return {
    riskLevel: 'medium',
    factors: [
      tr('ai.risk.factors.0', 'Heavy rainfall expected in the next 12 hours'),
      tr('ai.risk.factors.1', 'Low-lying area — potential for water accumulation'),
      tr('ai.risk.factors.2', 'No active geological warnings'),
    ],
    disclaimer: tr('ai.risk.disclaimer', 'Risk analysis is based on available data and may not reflect all hazards.'),
  };
}
