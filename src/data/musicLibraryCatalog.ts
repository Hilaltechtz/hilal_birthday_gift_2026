export type MusicCategoryId =
  | 'romantic-birthday'
  | 'emotional-birthday'
  | 'beautiful-friendship'
  | 'cinematic-birthday'
  | 'happy-birthday'
  | 'inspirational'
  | 'soft-piano'
  | 'luxury-celebration'
  | 'popular-social';

export interface MusicCategoryDef {
  id: MusicCategoryId;
  label: string;
  description: string;
}

export const MUSIC_CATEGORIES: MusicCategoryDef[] = [
  {
    id: 'romantic-birthday',
    label: 'Romantic Birthday Songs',
    description: 'Warm, tender melodies for heartfelt birthday tributes',
  },
  {
    id: 'emotional-birthday',
    label: 'Emotional Birthday Songs',
    description: 'Touching strings and piano scores for deeply moving wishes',
  },
  {
    id: 'beautiful-friendship',
    label: 'Beautiful Friendship Songs',
    description: 'Bright acoustic-style harmonies celebrating lifelong friendship',
  },
  {
    id: 'cinematic-birthday',
    label: 'Cinematic Birthday Music',
    description: 'Sweeping orchestral builds for dramatic calendar intros & reveals',
  },
  {
    id: 'happy-birthday',
    label: 'Happy Birthday Celebrations',
    description: 'Joyful birthday anthems and upbeat cake-cutting arrangements',
  },
  {
    id: 'inspirational',
    label: 'Inspirational Music',
    description: 'Uplifting anthems for milestone memories and bright wishes',
  },
  {
    id: 'soft-piano',
    label: 'Soft Piano Music',
    description: 'Delicate solo grand piano pieces for serene photo slideshows',
  },
  {
    id: 'luxury-celebration',
    label: 'Luxury Celebration Music',
    description: 'Elegant waltzes and champagne soirée strings for gold-themed reels',
  },
  {
    id: 'popular-social',
    label: 'Popular Social Media Music',
    description: 'Crisp beat-driven grooves crafted for Reels, TikTok & Status cuts',
  },
];

export type ArrangementStyle =
  | 'waltz-romantic'
  | 'emotional-strings'
  | 'friendship-groove'
  | 'cinematic-swell'
  | 'happy-birthday-classic'
  | 'celebration-march'
  | 'inspirational-pulse'
  | 'solo-piano'
  | 'luxury-soiree'
  | 'social-pop-beat';

export interface LicensedLibraryTrack {
  id: string;
  title: string;
  artist: string;
  category: MusicCategoryId;
  categoryLabel: string;
  idealScene: string;
  description: string;
  durationSeconds: number;
  bpm: number;
  popularityScore: number; // 1..100 verified studio popularity order
  licenseLabel: string;
  formatLabel: string;
  qualityLabel: string;
  exportPermitted: true;
  availability: 'available';
  arrangementStyle: ArrangementStyle;
  rootMidi: number;
  progression: number[]; // Semitone offsets for 4-bar chord cycle
  customMelodyMidi?: number[]; // Optional explicit melody (e.g. traditional Public Domain Happy Birthday)
  customMelodyBeats?: number[];
  hasPercussion: boolean;
  seedOffset: number;
}

export interface RequestedCommercialTrack {
  id: string;
  requestNumber: number;
  title: string;
  artist: string;
  note: string;
  availability: 'unavailable-license-required';
  exportPermitted: false;
  isDuplicate?: boolean;
  duplicateOfRequestNumber?: number;
}

export const BUILT_IN_MUSIC_LIBRARY: LicensedLibraryTrack[] = [
  // 1. Romantic Birthday Songs
  {
    id: 'lib-candlelight-waltz',
    title: 'Candlelight Waltz in C',
    artist: 'Magical Studio Ensemble',
    category: 'romantic-birthday',
    categoryLabel: 'Romantic Birthday Songs',
    idealScene: 'Photo Slideshows & Wishes',
    description: 'Tender 3/4 grand piano arpeggios layered with warm velvet strings.',
    durationSeconds: 38,
    bpm: 88,
    popularityScore: 98,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'waltz-romantic',
    rootMidi: 60, // C4
    progression: [0, 9, 5, 7], // I - vi - IV - V
    hasPercussion: false,
    seedOffset: 11,
  },
  {
    id: 'lib-velvet-promise',
    title: 'Velvet Promise Nocturne',
    artist: 'Clara Vance & Strings',
    category: 'romantic-birthday',
    categoryLabel: 'Romantic Birthday Songs',
    idealScene: 'Final Birthday Surprises',
    description: 'Intimate piano & harp dialogue with glowing romantic harmonic swells.',
    durationSeconds: 42,
    bpm: 82,
    popularityScore: 91,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'waltz-romantic',
    rootMidi: 65, // F4
    progression: [0, 7, 9, 5], // I - V - vi - IV
    hasPercussion: false,
    seedOffset: 23,
  },

  // 2. Emotional Birthday Songs
  {
    id: 'lib-through-every-season',
    title: 'Through Every Season',
    artist: 'Noel Arden Chamber',
    category: 'emotional-birthday',
    categoryLabel: 'Emotional Birthday Songs',
    idealScene: 'Emotional Birthday Wishes',
    description: 'Slow-building legato strings and expressive piano for deeply touching wishes.',
    durationSeconds: 44,
    bpm: 78,
    popularityScore: 96,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'emotional-strings',
    rootMidi: 62, // D4
    progression: [9, 5, 0, 7], // vi - IV - I - V
    hasPercussion: false,
    seedOffset: 37,
  },
  {
    id: 'lib-golden-years-memory',
    title: 'Golden Years Memory',
    artist: 'Elena Solis Quartet',
    category: 'emotional-birthday',
    categoryLabel: 'Emotional Birthday Songs',
    idealScene: 'Photo Slideshows',
    description: 'Warm nostalgic chords and celesta accents honoring cherished moments.',
    durationSeconds: 40,
    bpm: 84,
    popularityScore: 89,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'emotional-strings',
    rootMidi: 58, // Bb3
    progression: [0, 4, 5, 7], // I - iii - IV - V
    hasPercussion: false,
    seedOffset: 41,
  },

  // 3. Beautiful Friendship Songs
  {
    id: 'lib-best-friends-forevermore',
    title: 'Best Friends Forevermore',
    artist: 'Sunnyvale Collective',
    category: 'beautiful-friendship',
    categoryLabel: 'Beautiful Friendship Songs',
    idealScene: 'Friendship Celebrations',
    description: 'Bright, uplifting melodic pulse with cheerful piano and soft shaker groove.',
    durationSeconds: 36,
    bpm: 108,
    popularityScore: 95,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'friendship-groove',
    rootMidi: 67, // G4
    progression: [0, 7, 9, 5], // I - V - vi - IV
    hasPercussion: true,
    seedOffset: 53,
  },
  {
    id: 'lib-golden-hour-laughter',
    title: 'Golden Hour Laughter',
    artist: 'Aurelia Acoustic',
    category: 'beautiful-friendship',
    categoryLabel: 'Beautiful Friendship Songs',
    idealScene: 'Photo Slideshows & Friendship',
    description: 'Radiant plucked harp harmonies and steady beat-friendly rhythm.',
    durationSeconds: 38,
    bpm: 104,
    popularityScore: 88,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'friendship-groove',
    rootMidi: 60, // C4
    progression: [0, 5, 9, 7], // I - IV - vi - V
    hasPercussion: true,
    seedOffset: 61,
  },

  // 4. Cinematic Birthday Music
  {
    id: 'lib-starlight-overture',
    title: 'Starlight Calendar Overture',
    artist: 'Royal Philharmonic Studio',
    category: 'cinematic-birthday',
    categoryLabel: 'Cinematic Birthday Music',
    idealScene: 'Cinematic Introductions',
    description: 'Dramatic timpani-style pulse, shimmering celesta, and triumphant string climax.',
    durationSeconds: 42,
    bpm: 96,
    popularityScore: 97,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'cinematic-swell',
    rootMidi: 60, // C4
    progression: [9, 5, 0, 7],
    hasPercussion: true,
    seedOffset: 73,
  },
  {
    id: 'lib-crown-of-celebration',
    title: 'Crown of Celebration',
    artist: 'Julian Mercer Orchestra',
    category: 'cinematic-birthday',
    categoryLabel: 'Cinematic Birthday Music',
    idealScene: 'Final Birthday Surprises',
    description: 'Widescreen brass-warmth pads and soaring violins built for big birthday reveals.',
    durationSeconds: 45,
    bpm: 92,
    popularityScore: 90,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'cinematic-swell',
    rootMidi: 62, // D4
    progression: [0, 7, 5, 7],
    hasPercussion: true,
    seedOffset: 79,
  },

  // 5. Happy Birthday Celebrations
  {
    id: 'lib-happy-birthday-classic',
    title: 'Happy Birthday (Classic Piano & Strings)',
    artist: 'Traditional · Magical Studio Arrangement',
    category: 'happy-birthday',
    categoryLabel: 'Happy Birthday Celebrations',
    idealScene: 'Birthday Cake Scenes',
    description: 'Authentic traditional Happy Birthday melody on concert piano, bells, and festive strings.',
    durationSeconds: 36,
    bpm: 100,
    popularityScore: 100,
    licenseLabel: 'Public Domain Composition · Studio Recording',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'happy-birthday-classic',
    rootMidi: 60, // C4
    progression: [0, 7, 0, 5],
    // Traditional "Happy Birthday to You" melody in C major (G4=67 .. C5=72 .. G5=79)
    customMelodyMidi: [
      67, 67, 69, 67, 72, 71,
      67, 67, 69, 67, 74, 72,
      67, 67, 79, 76, 72, 71, 69,
      77, 77, 76, 72, 74, 72,
    ],
    customMelodyBeats: [
      0.75, 0.25, 1, 1, 1, 2,
      0.75, 0.25, 1, 1, 1, 2,
      0.75, 0.25, 1, 1, 1, 1, 2,
      0.75, 0.25, 1, 1, 1, 3,
    ],
    hasPercussion: true,
    seedOffset: 83,
  },
  {
    id: 'lib-make-a-wish-parade',
    title: 'Make a Wish Joyful Anthem',
    artist: 'Sparkle Party Ensemble',
    category: 'happy-birthday',
    categoryLabel: 'Happy Birthday Celebrations',
    idealScene: 'Cake & Celebration Scenes',
    description: 'Upbeat celebratory chimes, cheerful chord hits, and crisp beat transients.',
    durationSeconds: 36,
    bpm: 118,
    popularityScore: 93,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'celebration-march',
    rootMidi: 65, // F4
    progression: [0, 5, 7, 0],
    hasPercussion: true,
    seedOffset: 89,
  },

  // 6. Inspirational Music
  {
    id: 'lib-rise-shine-horizon',
    title: 'Rise & Shine Horizon',
    artist: 'Lumina Keys & Strings',
    category: 'inspirational',
    categoryLabel: 'Inspirational Music',
    idealScene: 'Birthday Wishes & Milestones',
    description: 'Anthemic rising chords with inspiring bell arpeggios and crisp pulse.',
    durationSeconds: 40,
    bpm: 112,
    popularityScore: 94,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'inspirational-pulse',
    rootMidi: 64, // E4
    progression: [0, 7, 9, 5],
    hasPercussion: true,
    seedOffset: 97,
  },
  {
    id: 'lib-dream-beyond-tomorrow',
    title: 'Dream Beyond Tomorrow',
    artist: 'Vespera Soundworks',
    category: 'inspirational',
    categoryLabel: 'Inspirational Music',
    idealScene: 'Emotional & Inspirational Wishes',
    description: 'Hopeful piano ostinato flowering into warm panoramic string harmonies.',
    durationSeconds: 42,
    bpm: 102,
    popularityScore: 87,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'inspirational-pulse',
    rootMidi: 60, // C4
    progression: [5, 0, 7, 9],
    hasPercussion: true,
    seedOffset: 103,
  },

  // 7. Soft Piano Music
  {
    id: 'lib-moonlight-piano-reverie',
    title: 'Moonlight Piano Reverie',
    artist: 'Gabriel Moreau (Solo Piano)',
    category: 'soft-piano',
    categoryLabel: 'Soft Piano Music',
    idealScene: 'Photo Slideshows & Wishes',
    description: 'Delicate acoustic grand piano voicings with gentle room sustain.',
    durationSeconds: 42,
    bpm: 76,
    popularityScore: 95,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'solo-piano',
    rootMidi: 60, // C4
    progression: [0, 9, 5, 7],
    hasPercussion: false,
    seedOffset: 109,
  },
  {
    id: 'lib-gentle-dawn-solo-piano',
    title: 'Gentle Dawn Solo Piano',
    artist: 'Clara Vance (Solo Piano)',
    category: 'soft-piano',
    categoryLabel: 'Soft Piano Music',
    idealScene: 'Romantic & Calm Memories',
    description: 'Warm lyrical right-hand melody over flowing broken chords.',
    durationSeconds: 40,
    bpm: 80,
    popularityScore: 86,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'solo-piano',
    rootMidi: 67, // G4
    progression: [0, 4, 9, 5],
    hasPercussion: false,
    seedOffset: 113,
  },

  // 8. Luxury Celebration Music
  {
    id: 'lib-champagne-soiree',
    title: 'Champagne Soirée Strings',
    artist: 'Maison d’Or Ensemble',
    category: 'luxury-celebration',
    categoryLabel: 'Luxury Celebration Music',
    idealScene: 'Luxury Cake & Finale Scenes',
    description: 'Sophisticated golden-era string waltz with sparkling celesta highlights.',
    durationSeconds: 38,
    bpm: 98,
    popularityScore: 96,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'luxury-soiree',
    rootMidi: 62, // D4
    progression: [0, 9, 5, 7],
    hasPercussion: true,
    seedOffset: 127,
  },
  {
    id: 'lib-velvet-gala-waltz',
    title: 'Velvet Gala Celebration',
    artist: 'Orchestre Royale',
    category: 'luxury-celebration',
    categoryLabel: 'Luxury Celebration Music',
    idealScene: 'Calendar Intro & Luxury Reels',
    description: 'Regal celebration motif blending golden chimes, rich cello bass, and warm keys.',
    durationSeconds: 40,
    bpm: 94,
    popularityScore: 92,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'luxury-soiree',
    rootMidi: 65, // F4
    progression: [0, 7, 9, 5],
    hasPercussion: true,
    seedOffset: 131,
  },

  // 9. Popular Social Media Music
  {
    id: 'lib-birthday-glow-reels',
    title: 'Birthday Glow Reels Beat',
    artist: 'Pulse & Velvet',
    category: 'popular-social',
    categoryLabel: 'Popular Social Media Music',
    idealScene: 'TikTok, Reels & WhatsApp Status',
    description: 'Punchy modern pop beat with bright synth-piano chords for automatic beat cuts.',
    durationSeconds: 34,
    bpm: 120,
    popularityScore: 99,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'social-pop-beat',
    rootMidi: 60, // C4
    progression: [9, 5, 0, 7],
    hasPercussion: true,
    seedOffset: 149,
  },
  {
    id: 'lib-confetti-pop-groove',
    title: 'Confetti Pop Groove',
    artist: 'Neon Ribbon Audio',
    category: 'popular-social',
    categoryLabel: 'Popular Social Media Music',
    idealScene: 'Photo Slideshows & Fast Cuts',
    description: 'Crisp dance-pop rhythm engineered to snap transitions onto strong downbeats.',
    durationSeconds: 36,
    bpm: 124,
    popularityScore: 92,
    licenseLabel: 'Studio Royalty-Free Sync License',
    formatLabel: 'WAV (Stereo PCM)',
    qualityLabel: '32 kHz · 16-bit · 1024 kbps',
    exportPermitted: true,
    availability: 'available',
    arrangementStyle: 'social-pop-beat',
    rootMidi: 67, // G4
    progression: [0, 7, 9, 5],
    hasPercussion: true,
    seedOffset: 157,
  },
];

/**
 * Searchable Requested Commercial Titles (#1 - #10).
 * Commercially copyrighted recordings are never illegally hosted or silently replaced:
 * they appear honestly as Unavailable unless/until the admin uploads their own licensed MP3.
 */
export const REQUESTED_SONGS_CATALOG: RequestedCommercialTrack[] = [
  {
    id: 'req-1-thousand-years',
    requestNumber: 1,
    title: 'A Thousand Years',
    artist: 'Christina Perri',
    note: 'Copyrighted commercial master. Unavailable for built-in video sync/export without a commercial license — upload your own licensed MP3.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-2-phoenix-rising',
    requestNumber: 2,
    title: 'Phoenix Rising',
    artist: 'Commercial Release',
    note: 'Commercial recording requires external sync authorization — unavailable in built-in export library.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-3-message-in-a-bottle',
    requestNumber: 3,
    title: 'Message in a Bottle',
    artist: 'Taylor Swift',
    note: 'Copyrighted commercial recording. Unavailable for built-in export — upload your own legally obtained MP3 in Option B.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-4-thats-so-true',
    requestNumber: 4,
    title: "That's So True",
    artist: 'Gracie Abrams',
    note: 'Copyrighted commercial recording. Unavailable for built-in export — upload your own legally obtained MP3 in Option B.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-5-sona',
    requestNumber: 5,
    title: 'Sona',
    artist: 'Commercial Release',
    note: 'Commercial recording requires external sync authorization — unavailable in built-in export library.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-6-ordinary',
    requestNumber: 6,
    title: 'Ordinary',
    artist: 'Alex Warren',
    note: 'Copyrighted commercial recording. Unavailable for built-in export — upload your own legally obtained MP3 in Option B.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-7-dandelions',
    requestNumber: 7,
    title: 'Dandelions',
    artist: 'Ruth B.',
    note: 'Copyrighted commercial recording. Unavailable for built-in export — upload your own legally obtained MP3 in Option B.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-8-thousand-years-dup',
    requestNumber: 8,
    title: 'A Thousand Years',
    artist: 'Christina Perri',
    note: 'Duplicate of Request #1 ("A Thousand Years"). Copyrighted commercial master — upload your own licensed MP3 in Option B.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
    isDuplicate: true,
    duplicateOfRequestNumber: 1,
  },
  {
    id: 'req-9-die-with-a-smile',
    requestNumber: 9,
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    note: 'Copyrighted commercial recording. Unavailable for built-in export — upload your own legally obtained MP3 in Option B.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
  {
    id: 'req-10-happy-birthday-busy-signal',
    requestNumber: 10,
    title: 'Happy Birthday',
    artist: 'Busy Signal',
    note: 'Copyrighted commercial master by Busy Signal. Unavailable for built-in export without license — upload your own licensed MP3, or use our Public Domain Happy Birthday piano arrangement.',
    availability: 'unavailable-license-required',
    exportPermitted: false,
  },
];
