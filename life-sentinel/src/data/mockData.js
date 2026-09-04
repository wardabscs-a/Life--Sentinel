// Mock data for demo/hackathon purposes
// Clearly labeled as demo data - replace with real API calls in production

export const EMERGENCY_CATEGORIES = [
  { id: 'accident', icon: 'Car', color: '#f59e0b' },
  { id: 'fire', icon: 'Flame', color: '#ef4444' },
  { id: 'flood', icon: 'Waves', color: '#3b82f6' },
  { id: 'earthquake', icon: 'Mountain', color: '#8b5cf6' },
  { id: 'medical', icon: 'Heart', color: '#ec4899' },
  { id: 'crime', icon: 'ShieldAlert', color: '#f97316' },
  { id: 'other', icon: 'AlertTriangle', color: '#6b7280' },
];

export const SEVERITY_LEVELS = [
  { id: 'critical', level: 4, color: '#dc2626', bgColor: '#fef2f2' },
  { id: 'high', level: 3, color: '#f97316', bgColor: '#fffbeb' },
  { id: 'medium', level: 2, color: '#eab308', bgColor: '#fefce8' },
  { id: 'low', level: 1, color: '#22c55e', bgColor: '#f0fdf4' },
];

export const MOCK_RESOURCES = [
  { id: 1, name: 'PIMS Hospital', type: 'hospital', lat: 33.7294, lng: 73.0931, phone: '+92-51-9261151', address: 'Sector G-8/3, Islamabad', distance: '2.1 km' },
  { id: 2, name: 'Shifa International Hospital', type: 'hospital', lat: 33.7019, lng: 73.0479, phone: '+92-51-8464646', address: 'Sector H-8/4, Islamabad', distance: '3.5 km' },
  { id: 3, name: 'Capital Hospital', type: 'hospital', lat: 33.6905, lng: 73.0480, phone: '+92-51-9203070', address: 'Sector G-6/2, Islamabad', distance: '1.8 km' },
  { id: 4, name: 'IJP Police Station', type: 'police', lat: 33.6850, lng: 73.0380, phone: '+92-51-9261999', address: 'IJP Road, Islamabad', distance: '0.8 km' },
  { id: 5, name: 'Kohsar Police Station', type: 'police', lat: 33.7090, lng: 73.0520, phone: '+92-51-9261555', address: 'Street 21, F-6/3, Islamabad', distance: '2.3 km' },
  { id: 6, name: 'Fire Station G-6', type: 'fire', lat: 33.6930, lng: 73.0420, phone: '+92-51-115', address: 'G-6 Markaz, Islamabad', distance: '1.2 km' },
  { id: 7, name: 'Fire Station F-8', type: 'fire', lat: 33.7100, lng: 73.0560, phone: '+92-51-115', address: 'F-8 Markaz, Islamabad', distance: '2.8 km' },
  { id: 8, name: 'Edhi Shelter F-7', type: 'shelter', lat: 33.7120, lng: 73.0450, phone: '+92-51-2652071', address: 'F-7 Markaz, Islamabad', distance: '1.5 km' },
  { id: 9, name: 'Rescue 1122 Base', type: 'ambulance', lat: 33.6880, lng: 73.0500, phone: '1122', address: 'Main Boulevard, Islamabad', distance: '0.5 km' },
  { id: 10, name: 'Edhi Ambulance Service', type: 'ambulance', lat: 33.6800, lng: 73.0450, phone: '+92-51-2652071', address: 'Blue Area, Islamabad', distance: '1.0 km' },
];

export const MOCK_ALERTS = [
  {
    id: 1,
    type: 'weather',
    severity: 'high',
    title: 'Heavy Rainfall Expected',
    description: 'Meteorological Department warns of heavy rainfall (50-80mm) in Islamabad and surrounding areas over the next 24 hours. Potential for urban flooding in low-lying areas.',
    verified: true,
    source: 'Pakistan Meteorological Department',
    timestamp: '2026-08-29T08:00:00Z',
    location: 'Islamabad Capital Territory',
    lat: 33.6844, lng: 73.0479,
  },
  {
    id: 2,
    type: 'flood',
    severity: 'medium',
    title: 'Flash Flood Warning - Nullah Korang',
    description: 'Water level in Nullah Korang rising. Low-lying areas near Korang Town advised to prepare for possible evacuation.',
    verified: true,
    source: 'District Disaster Management Authority',
    timestamp: '2026-08-29T06:30:00Z',
    location: 'Korang Town Area',
    lat: 33.6450, lng: 73.1100,
  },
  {
    id: 3,
    type: 'road',
    severity: 'medium',
    title: 'Road Closure - IJP Road',
    description: 'IJP Road partially closed near Koral Interchange due to water accumulation. Traffic diversions in place.',
    verified: false,
    source: 'Community Report',
    timestamp: '2026-08-29T07:15:00Z',
    location: 'IJP Road, near Koral Interchange',
    lat: 33.6500, lng: 73.0900,
  },
  {
    id: 4,
    type: 'fire',
    severity: 'low',
    title: 'Minor Fire - Commercial Area',
    description: 'Small fire reported in a shop in F-7 Markaz. Fire brigade has arrived at the scene.',
    verified: false,
    source: 'Community Report',
    timestamp: '2026-08-29T09:45:00Z',
    location: 'F-7 Markaz, Islamabad',
    lat: 33.7100, lng: 73.0400,
  },
];

export const MOCK_COMMUNITY_INCIDENTS = [
  { id: 'c1', lat: 33.6920, lng: 73.0550, category: 'flood', severity: 'medium', title: 'Street Flooding in G-7', description: 'Main road flooded near G-7 Markaz. Vehicles struggling to pass.', reportCount: 5, status: 'active', timestamp: '2026-08-29T08:30:00Z' },
  { id: 'c2', lat: 33.7050, lng: 73.0350, category: 'accident', severity: 'high', title: 'Multi-vehicle Accident on Srinagar Highway', description: 'Three vehicles involved. Emergency services on scene. Lane blocked.', reportCount: 12, status: 'active', timestamp: '2026-08-29T07:00:00Z' },
  { id: 'c3', lat: 33.6780, lng: 73.0620, category: 'crime', severity: 'low', title: 'Theft Report - Blue Area', description: 'Multiple reports of pickpocketing near Jinnah Avenue bus stops.', reportCount: 3, status: 'active', timestamp: '2026-08-29T09:00:00Z' },
  { id: 'c4', lat: 33.7150, lng: 73.0680, category: 'other', severity: 'low', title: 'Power Lines Down in E-7', description: 'Fallen power lines on Street 15, E-7. IESCO notified.', reportCount: 2, status: 'active', timestamp: '2026-08-29T06:45:00Z' },
  { id: 'c5', lat: 33.6850, lng: 73.0280, category: 'fire', severity: 'medium', title: 'Building Fire in I-8', description: 'Residential building fire reported in I-8/1. Fire brigade en route.', reportCount: 7, status: 'active', timestamp: '2026-08-29T10:00:00Z' },
  { id: 'c6', lat: 33.6980, lng: 73.0500, category: 'flood', severity: 'low', title: 'Water Logging in F-6', description: 'Minor water logging in F-6/2 service road.', reportCount: 2, status: 'resolved', timestamp: '2026-08-28T14:00:00Z' },
];

export const MOCK_ROUTES = [
  { id: 'r1', name: 'Srinagar Highway', status: 'hazardous', reason: 'Multi-vehicle accident reported. Partial lane closure.', coordinates: [[33.705, 73.035], [33.710, 73.040], [33.715, 73.050]] },
  { id: 'r2', name: 'IJP Road', status: 'hazardous', reason: 'Water accumulation near Koral Interchange.', coordinates: [[33.680, 73.050], [33.685, 73.055], [33.690, 73.060]] },
  { id: 'r3', name: 'Constitution Avenue', status: 'safe', reason: 'Clear passage. Normal traffic.', coordinates: [[33.700, 73.050], [33.705, 73.055], [33.710, 73.060]] },
  { id: 'r4', name: '9th Avenue', status: 'safe', reason: 'Minor congestion. Passable.', coordinates: [[33.690, 73.040], [33.695, 73.045], [33.700, 73.050]] },
];

export const GUIDANCE_CATEGORIES = [
  {
    id: 'firstAid',
    icon: 'Heart',
    color: '#ef4444',
    titleKey: 'guidance.firstAid',
    items: [
      {
        title: 'CPR (Cardiopulmonary Resuscitation)',
        steps: [
          'Check if the person is responsive. Tap and shout.',
          'Call emergency services (1122).',
          'Place heel of one hand on center of chest.',
          'Push hard and fast: 30 compressions at 100-120 per minute.',
          'Give 2 rescue breaths if trained.',
          'Continue until help arrives or person responds.',
        ],
      },
      {
        title: 'Severe Bleeding',
        steps: [
          'Apply direct pressure with a clean cloth.',
          'Do not remove the cloth; add more layers if needed.',
          'Elevate the wound above heart level if possible.',
          'Apply a tourniquet only if bleeding does not stop with pressure.',
          'Keep the person warm and calm.',
          'Seek immediate medical attention.',
        ],
      },
      {
        title: 'Burns',
        steps: [
          'Cool the burn under cool running water for at least 10 minutes.',
          'Remove jewelry or clothing near the burn (unless stuck).',
          'Cover with a clean, non-stick bandage or cling wrap.',
          'Do not apply ice, butter, or creams.',
          'Do not burst blisters.',
          'Seek medical help for severe or large burns.',
        ],
      },
      {
        title: 'Choking',
        steps: [
          'Encourage the person to cough.',
          'Give up to 5 back blows between shoulder blades.',
          'Give up to 5 abdominal thrusts (Heimlich maneuver).',
          'Alternate between back blows and thrusts.',
          'If the person becomes unconscious, begin CPR.',
          'Call emergency services immediately.',
        ],
      },
      {
        title: 'Fractures & Sprains',
        steps: [
          'Keep the injured area still and supported.',
          'Apply a splint or sling to immobilize the fracture.',
          'Use ice packs to reduce swelling (wrap in cloth, not directly on skin).',
          'Do not try to straighten or push back a broken bone.',
          'Elevate the injured limb if possible.',
          'Seek medical attention immediately.',
        ],
      },
    ],
  },
  {
    id: 'fire',
    icon: 'Flame',
    color: '#f97316',
    titleKey: 'guidance.fire',
    items: [
      {
        title: 'Fire Evacuation',
        steps: [
          'Stay calm. Alert others nearby.',
          'Feel doors before opening — if hot, find another exit.',
          'Crawl low under smoke.',
          'Do not use elevators.',
          'Go to your designated assembly point.',
          'Do not re-enter the building.',
        ],
      },
      {
        title: 'If Your Clothes Catch Fire',
        steps: [
          'STOP where you are — do not run.',
          'DROP to the ground.',
          'COVER your face with your hands.',
          'ROLL over and over until the flames are out.',
          'Cool the burned area with water.',
          'Seek medical attention immediately.',
        ],
      },
      {
        title: 'Kitchen Fire Safety',
        steps: [
          'Never leave cooking unattended on open flames.',
          'Keep flammable items away from the stove.',
          'Use a lid to smother a pan fire — do not use water on oil fires.',
          'Turn off the gas supply immediately if safe to do so.',
          'Use a Class B/C fire extinguisher if available.',
          'Evacuate and call the fire brigade (16) if the fire spreads.',
        ],
      },
      {
        title: 'Electrical Fire',
        steps: [
          'Do not use water on electrical fires.',
          'Turn off the main power supply if safe.',
          'Use a CO2 or dry powder fire extinguisher.',
          'Evacuate the area immediately.',
          'Call fire brigade (16) and WAPDA (118).',
          'Do not touch electrical equipment or wires.',
        ],
      },
    ],
  },
  {
    id: 'roadAccident',
    icon: 'Car',
    color: '#f59e0b',
    titleKey: 'guidance.roadAccident',
    items: [
      {
        title: 'At the Accident Scene',
        steps: [
          'Move to a safe location away from traffic.',
          'Turn on hazard lights and place warning triangles if available.',
          'Call Rescue 1122 and Police (15) immediately.',
          'Do not move injured persons unless they are in immediate danger.',
          'Take photos of the scene for documentation.',
          'Exchange information with other drivers involved.',
        ],
      },
      {
        title: 'Helping Injured Persons',
        steps: [
          'Check if the person is conscious and breathing.',
          'Do not remove helmets from motorcyclists.',
          'Apply pressure to any visible bleeding wounds.',
          'Keep the injured person warm and still.',
          'Do not give food or water to injured persons.',
          'Wait for professional medical help to arrive.',
        ],
      },
      {
        title: 'Vehicle Fire After Accident',
        steps: [
          'Evacuate all passengers immediately.',
          'Move at least 30 meters away from the vehicle.',
          'Call fire brigade (16) and Rescue 1122.',
          'Do not attempt to retrieve belongings from a burning vehicle.',
          'Warn other drivers and pedestrians to stay clear.',
          'Use a fire extinguisher only if the fire is small and you are safe.',
        ],
      },
      {
        title: 'Motorway / Highway Emergency',
        steps: [
          'Pull over to the left shoulder as far as possible.',
          'Turn on hazard lights immediately.',
          'Call Motorway Police (130) for assistance.',
          'Stay inside the vehicle with seatbelts on if it is safe.',
          'If you must exit, stand behind the guardrail.',
          'Never walk on the motorway.',
        ],
      },
    ],
  },
  {
    id: 'medical',
    icon: 'Cross',
    color: '#ec4899',
    titleKey: 'guidance.medical',
    items: [
      {
        title: 'Heart Attack',
        steps: [
          'Call Rescue 1122 immediately.',
          'Have the person sit down and rest in a comfortable position.',
          'Loosen any tight clothing.',
          'If prescribed, help them take nitroglycerin.',
          'If aspirin is available and they are not allergic, have them chew one.',
          'If the person becomes unconscious, begin CPR.',
        ],
      },
      {
        title: 'Stroke',
        steps: [
          'Remember FAST: Face drooping, Arm weakness, Speech difficulty, Time to call.',
          'Call Rescue 1122 immediately.',
          'Note the time when symptoms first appeared.',
          'Keep the person comfortable with their head slightly elevated.',
          'Do not give food or drink.',
          'Do not let them go to sleep.',
        ],
      },
      {
        title: 'Asthma Attack',
        steps: [
          'Help the person sit upright.',
          'Help them use their inhaler (usually 2 puffs).',
          'Encourage slow, steady breathing.',
          'If no improvement after 10 minutes, call 1122.',
          'Keep them calm and reassured.',
          'Do not lay them flat.',
        ],
      },
      {
        title: 'Seizure / Epilepsy',
        steps: [
          'Clear the area of dangerous objects.',
          'Place something soft under their head.',
          'Do not restrain the person or put anything in their mouth.',
          'Time the seizure — if it lasts more than 5 minutes, call 1122.',
          'After the seizure, place them in recovery position (on their side).',
          'Stay with them until they are fully alert.',
        ],
      },
      {
        title: 'Allergic Reaction (Anaphylaxis)',
        steps: [
          'Call 1122 immediately.',
          'If the person has an EpiPen, help them use it.',
          'Have them lie down with legs elevated (unless breathing is difficult).',
          'Loosen tight clothing and cover with a blanket.',
          'If breathing stops, begin CPR.',
          'Do not give oral medications if they have trouble swallowing.',
        ],
      },
    ],
  },
  {
    id: 'flood',
    icon: 'Waves',
    color: '#3b82f6',
    titleKey: 'guidance.flood',
    items: [
      {
        title: 'Flood Evacuation',
        steps: [
          'Move to higher ground immediately.',
          'Avoid walking through floodwater — 6 inches can knock you down.',
          'Do not drive through flooded roads.',
          'Turn off electricity at the main switch if safe to do so.',
          'Take your emergency kit and important documents.',
          'Listen to radio for official instructions.',
        ],
      },
      {
        title: 'During a Flood',
        steps: [
          'Stay away from rivers, streams, and low-lying areas.',
          'Do not touch electrical equipment if you are wet or standing in water.',
          'Watch out for downed power lines and gas leaks.',
          'Keep children and pets away from floodwater.',
          'If trapped in a building, go to the highest level (not the attic).',
          'Signal for help from a window or rooftop if needed.',
        ],
      },
      {
        title: 'After a Flood',
        steps: [
          'Do not return home until authorities say it is safe.',
          'Avoid walking in floodwater — it may be contaminated.',
          'Document all damage with photos for insurance.',
          'Disinfect everything that got wet.',
          'Watch for hazards: weakened structures, snakes, insects.',
          'Boil tap water before drinking until declared safe.',
        ],
      },
    ],
  },
  {
    id: 'earthquake',
    icon: 'Mountain',
    color: '#8b5cf6',
    titleKey: 'guidance.earthquake',
    items: [
      {
        title: 'During an Earthquake',
        steps: [
          'Drop to your hands and knees.',
          'Take cover under sturdy furniture or against an interior wall.',
          'Hold on until shaking stops.',
          'Stay away from windows, outside walls, and heavy objects.',
          'If outdoors, move to an open area away from buildings.',
          'If driving, pull over, stop, and stay inside the vehicle.',
        ],
      },
      {
        title: 'After an Earthquake',
        steps: [
          'Check yourself and others for injuries.',
          'Expect aftershocks — drop, cover, and hold on each time.',
          'Check for gas leaks, structural damage, and fire hazards.',
          'Do not use elevators.',
          'If building is damaged, evacuate carefully.',
          'Listen to official news and instructions.',
        ],
      },
      {
        title: 'If Trapped Under Debris',
        steps: [
          'Cover your mouth with a cloth to avoid dust.',
          'Do not light matches or lighters.',
          'Tap on a pipe or wall so rescuers can hear you.',
          'Shout only as a last resort — shouting causes dust inhalation.',
          'Move as little as possible to avoid kicking up dust.',
          'Conserve your energy and stay calm.',
        ],
      },
      {
        title: 'Earthquake Preparedness',
        steps: [
          'Secure heavy furniture, water heaters, and appliances to walls.',
          'Store heavy objects on lower shelves.',
          'Identify safe spots in each room of your home.',
          'Keep an emergency kit ready: water, food, flashlight, first aid.',
          'Practice earthquake drills with your family.',
          'Know how to turn off gas, water, and electricity.',
        ],
      },
    ],
  },
  {
    id: 'general',
    icon: 'AlertTriangle',
    color: '#6b7280',
    titleKey: 'guidance.general',
    items: [
      {
        title: 'Before Any Emergency',
        steps: [
          'Prepare an emergency kit: water, food, flashlight, batteries, first-aid kit, medications, documents.',
          'Identify safe spots in your home and workplace.',
          'Create a family communication plan.',
          'Know your evacuation routes.',
          'Keep important documents in a waterproof bag.',
          'Learn basic first aid.',
        ],
      },
      {
        title: 'During an Emergency',
        steps: [
          'Stay calm and assess the situation.',
          'Ensure your own safety first.',
          'Call emergency services if needed.',
          'Follow evacuation orders from authorities.',
          'Do not spread unverified information.',
          'Help others if it is safe to do so.',
        ],
      },
      {
        title: 'After an Emergency',
        steps: [
          'Check yourself and others for injuries.',
          'Do not enter damaged buildings.',
          'Listen to official news and updates.',
          'Document damage with photos for insurance.',
          'Stay away from downed power lines.',
          'Reach out to trusted contacts.',
        ],
      },
      {
        title: 'Personal Safety Tips',
        steps: [
          'Always let someone know where you are going.',
          'Keep your phone charged and carry a power bank.',
          'Save emergency numbers in your phone.',
          'Be aware of your surroundings, especially at night.',
          'Trust your instincts — if something feels wrong, leave.',
          'Learn self-defense basics.',
        ],
      },
    ],
  },
];

export const EMERGENCY_GUIDE = {
  firstAid: [
    {
      title: 'CPR (Cardiopulmonary Resuscitation)',
      steps: [
        'Check if the person is responsive. Tap and shout.',
        'Call emergency services (1122).',
        'Place heel of one hand on center of chest.',
        'Push hard and fast: 30 compressions at 100-120 per minute.',
        'Give 2 rescue breaths if trained.',
        'Continue until help arrives or person responds.',
      ],
    },
    {
      title: 'Severe Bleeding',
      steps: [
        'Apply direct pressure with a clean cloth.',
        'Do not remove the cloth; add more layers if needed.',
        'Elevate the wound above heart level if possible.',
        'Apply a tourniquet only if bleeding does not stop with pressure.',
        'Keep the person warm and calm.',
        'Seek immediate medical attention.',
      ],
    },
    {
      title: 'Burns',
      steps: [
        'Cool the burn under cool running water for at least 10 minutes.',
        'Remove jewelry or clothing near the burn (unless stuck).',
        'Cover with a clean, non-stick bandage or cling wrap.',
        'Do not apply ice, butter, or creams.',
        'Do not burst blisters.',
        'Seek medical help for severe or large burns.',
      ],
    },
    {
      title: 'Choking',
      steps: [
        'Encourage the person to cough.',
        'Give up to 5 back blows between shoulder blades.',
        'Give up to 5 abdominal thrusts (Heimlich maneuver).',
        'Alternate between back blows and thrusts.',
        'If the person becomes unconscious, begin CPR.',
        'Call emergency services immediately.',
      ],
    },
  ],
  evacuation: [
    {
      title: 'Fire Evacuation',
      steps: [
        'Stay calm. Alert others nearby.',
        'Feel doors before opening — if hot, find another exit.',
        'Crawl low under smoke.',
        'Do not use elevators.',
        'Go to your designated assembly point.',
        'Do not re-enter the building.',
      ],
    },
    {
      title: 'Flood Evacuation',
      steps: [
        'Move to higher ground immediately.',
        'Avoid walking through floodwater — 6 inches can knock you down.',
        'Do not drive through flooded roads.',
        'Turn off electricity at the main switch if safe to do so.',
        'Take your emergency kit and important documents.',
        'Listen to radio for official instructions.',
      ],
    },
    {
      title: 'Earthquake Response',
      steps: [
        'Drop to your hands and knees.',
        'Take cover under sturdy furniture or against an interior wall.',
        'Hold on until shaking stops.',
        'Stay away from windows, outside walls, and heavy objects.',
        'If outdoors, move to an open area away from buildings.',
        'After shaking stops, check for injuries and damage.',
      ],
    },
  ],
  emergencyNumbers: [
    { name: 'Rescue 1122 (Ambulance/Fire)', number: '1122', description: 'Emergency medical services, fire, and rescue' },
    { name: 'Police', number: '15', description: 'Police emergency line' },
    { name: 'Edhi Foundation', number: '115', description: 'Ambulance and social services' },
    { name: 'Fire Brigade', number: '16', description: 'Fire department' },
    { name: 'Motorway Police', number: '130', description: 'National Highways & Motorway Police' },
    { name: 'Bomb Disposal', number: '111-222-555', description: 'Bomb disposal squad' },
    { name: 'WAPDA (Power)', number: '118', description: 'Power outage and electrical emergencies' },
  ],
  basicInstructions: [
    {
      title: 'Before Any Emergency',
      steps: [
        'Prepare an emergency kit: water, food, flashlight, batteries, first-aid kit, medications, documents.',
        'Identify safe spots in your home and workplace.',
        'Create a family communication plan.',
        'Know your evacuation routes.',
        'Keep important documents in a waterproof bag.',
        'Learn basic first aid.',
      ],
    },
    {
      title: 'During an Emergency',
      steps: [
        'Stay calm and assess the situation.',
        'Ensure your own safety first.',
        'Call emergency services if needed.',
        'Follow evacuation orders from authorities.',
        'Do not spread unverified information.',
        'Help others if it is safe to do so.',
      ],
    },
    {
      title: 'After an Emergency',
      steps: [
        'Check yourself and others for injuries.',
        'Do not enter damaged buildings.',
        'Listen to official news and updates.',
        'Document damage with photos for insurance.',
        'Stay away from downed power lines.',
        'Reach out to trusted contacts.',
      ],
    },
  ],
};
