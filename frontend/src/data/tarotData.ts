export interface TarotCard {
  id: number;
  name: string;
  number: string;
  arcana: 'major' | 'minor';
  suit?: string;
  symbol: string;
  keywords: string[];
  meaning: string;
  shadow: string;
  element?: string;
  planet?: string;
}

export const MAJOR_ARCANA: TarotCard[] = [
  { id: 0,  name: 'The Fool',           number: '0',    arcana: 'major', symbol: '🌟', element: 'Air',   planet: 'Uranus',  keywords: ['New beginnings', 'Spontaneity', 'Leap of faith'],     meaning: 'A soul-stirring leap into the unknown. The universe invites you to trust the journey without needing to see the whole path.', shadow: 'Recklessness and naivety are leading you astray. Look before you leap.' },
  { id: 1,  name: 'The Magician',       number: 'I',    arcana: 'major', symbol: '✨', element: 'Air',   planet: 'Mercury', keywords: ['Willpower', 'Manifestation', 'Creation'],             meaning: 'Every resource you need already lives within you. Your focused intention can reshape reality — act with confidence.', shadow: 'Manipulation and illusion cloud your true power. Use gifts wisely.' },
  { id: 2,  name: 'The High Priestess', number: 'II',   arcana: 'major', symbol: '🌙', element: 'Water', planet: 'Moon',    keywords: ['Intuition', 'Mystery', 'Inner knowing'],             meaning: 'The deepest truths come in silence. Trust the whispers of your soul — hidden knowledge is surfacing for those willing to listen.', shadow: 'Secrets withheld and intuition ignored breed confusion. Trust yourself.' },
  { id: 3,  name: 'The Empress',        number: 'III',  arcana: 'major', symbol: '🌺', element: 'Earth', planet: 'Venus',   keywords: ['Abundance', 'Nurturing', 'Sensual creativity'],      meaning: 'A season of fertile abundance has arrived. Nature blesses your creative endeavors — allow beauty, growth and love to flourish.', shadow: 'Smothering control and creative blocks stifle natural growth.' },
  { id: 4,  name: 'The Emperor',        number: 'IV',   arcana: 'major', symbol: '👑', element: 'Fire',  planet: 'Aries',   keywords: ['Authority', 'Structure', 'Leadership'],              meaning: 'Build on solid foundations and lead with clarity. Your capacity to create order from chaos is your superpower right now.', shadow: 'Rigid control and domination over others creates resistance.' },
  { id: 5,  name: 'The Hierophant',     number: 'V',    arcana: 'major', symbol: '⛩', element: 'Earth', planet: 'Taurus',  keywords: ['Tradition', 'Spiritual wisdom', 'Guidance'],         meaning: 'Sacred wisdom and spiritual tradition offer a trusted map for your journey. Seek wisdom from mentors and ancient teachings.', shadow: 'Blind conformity and dogma trap you in outdated systems.' },
  { id: 6,  name: 'The Lovers',         number: 'VI',   arcana: 'major', symbol: '💫', element: 'Air',   planet: 'Gemini',  keywords: ['Union', 'Sacred choice', 'Heart alignment'],         meaning: 'A profound choice stands before you — one that must align with your deepest values. Love, partnership and harmony are central themes.', shadow: 'Misalignment of values and fear of commitment blocks true union.' },
  { id: 7,  name: 'The Chariot',        number: 'VII',  arcana: 'major', symbol: '⚡', element: 'Water', planet: 'Cancer',  keywords: ['Determination', 'Victory', 'Focused will'],          meaning: 'Harness opposing forces and direct them toward your goal with supreme focus. Victory belongs to those who refuse to be divided.', shadow: 'Aggression without direction scatters your energy and delays success.' },
  { id: 8,  name: 'Strength',           number: 'VIII', arcana: 'major', symbol: '🦁', element: 'Fire',  planet: 'Leo',     keywords: ['Courage', 'Compassion', 'Inner mastery'],            meaning: 'True strength is gentle mastery — it tames with love, not force. Your compassion and patience are the most powerful forces you possess.', shadow: 'Cowardice and self-doubt keep the lion of your potential in a cage.' },
  { id: 9,  name: 'The Hermit',         number: 'IX',   arcana: 'major', symbol: '🕯', element: 'Earth', planet: 'Virgo',   keywords: ['Solitude', 'Soul-searching', 'Inner light'],         meaning: 'A sacred period of introspection reveals truths that only emerge in stillness. Your inner light is both your guide and your gift to others.', shadow: 'Isolation and withdrawal from life delay the growth your soul is seeking.' },
  { id: 10, name: 'Wheel of Fortune',   number: 'X',    arcana: 'major', symbol: '☸',  element: 'Fire',  planet: 'Jupiter', keywords: ['Change', 'Destiny cycles', 'Turning point'],         meaning: 'The great cosmic wheel turns in your favor. What has been descending will rise again — prepare for a significant shift in fortune.', shadow: 'Clinging to old cycles keeps the wheel from turning. Release and flow.' },
  { id: 11, name: 'Justice',            number: 'XI',   arcana: 'major', symbol: '⚖',  element: 'Air',   planet: 'Libra',   keywords: ['Truth', 'Cosmic balance', 'Accountability'],         meaning: 'Cosmic balance is being restored. Every action has consequence — truth and fairness will prevail in all matters now unfolding.', shadow: 'Avoidance of truth and imbalance create karmic debt that must be cleared.' },
  { id: 12, name: 'The Hanged Man',     number: 'XII',  arcana: 'major', symbol: '🔄', element: 'Water', planet: 'Neptune', keywords: ['Surrender', 'New perspective', 'Sacred pause'],       meaning: 'Release your grip and gain an entirely new vantage point. What seems like a delay is sacred preparation for a greater unfolding.', shadow: 'Martyrdom and resistance to necessary surrender keep you suspended.' },
  { id: 13, name: 'Death',              number: 'XIII', arcana: 'major', symbol: '🌹', element: 'Water', planet: 'Scorpio', keywords: ['Transformation', 'Release', 'Inevitable rebirth'],   meaning: 'Something must end for something extraordinary to begin. This is not loss — it is the sacred gift of transformation. Embrace the passage.', shadow: 'Resistance to necessary endings keeps you trapped in what no longer serves.' },
  { id: 14, name: 'Temperance',         number: 'XIV',  arcana: 'major', symbol: '🌊', element: 'Fire',  planet: 'Sagittarius', keywords: ['Balance', 'Divine timing', 'Alchemy'],         meaning: 'Divine alchemy is at work in your life. The blending of opposites — patience and passion, faith and action — creates something extraordinary.', shadow: 'Excess and imbalance disrupt the sacred harmony you are being called to create.' },
  { id: 15, name: 'The Devil',          number: 'XV',   arcana: 'major', symbol: '⛓',  element: 'Earth', planet: 'Capricorn', keywords: ['Shadow self', 'Limiting beliefs', 'Liberation'], meaning: 'You hold the key to your own freedom. Name the patterns, addictions and fears that bind you — and watch the chains dissolve in your awareness.', shadow: 'Surrendering to temptation and compulsion deepens the illusion of captivity.' },
  { id: 16, name: 'The Tower',          number: 'XVI',  arcana: 'major', symbol: '🌩', element: 'Fire',  planet: 'Mars',    keywords: ['Sudden change', 'Revelation', 'Liberation'],         meaning: 'What cannot withstand truth is being dismantled. From the ruins of false structures, authentic life is finally built — trust the upheaval.', shadow: 'Avoiding necessary collapse prolongs a situation that is already beyond saving.' },
  { id: 17, name: 'The Star',           number: 'XVII', arcana: 'major', symbol: '⭐', element: 'Air',   planet: 'Aquarius', keywords: ['Hope', 'Healing', 'Cosmic inspiration'],           meaning: 'After the storm, your guiding star has returned. Deep healing, renewed hope and divine inspiration flow freely now — trust their direction.', shadow: 'Pessimism and lost faith block the healing light that is already shining for you.' },
  { id: 18, name: 'The Moon',           number: 'XVIII',arcana: 'major', symbol: '🌑', element: 'Water', planet: 'Pisces',   keywords: ['Illusion', 'Subconscious', 'Intuitive truth'],     meaning: 'Not all that appears is real. Journey through the fog of uncertainty by trusting your deepest instincts — your subconscious is your compass.', shadow: 'Paranoia and deception — your own fears are creating the monsters you see.' },
  { id: 19, name: 'The Sun',            number: 'XIX',  arcana: 'major', symbol: '☀',  element: 'Fire',  planet: 'Sun',     keywords: ['Joy', 'Radiant success', 'Awakened vitality'],       meaning: 'Radiant joy and success are your birthright. The darkness has passed — step fully into your light and let it illuminate everything around you.', shadow: 'Ego and superficiality dim the genuine light that seeks to shine through you.' },
  { id: 20, name: 'Judgement',          number: 'XX',   arcana: 'major', symbol: '📯', element: 'Fire',  planet: 'Pluto',   keywords: ['Awakening', 'Higher calling', 'Soul reckoning'],     meaning: 'A profound awakening stirs your soul to its highest expression. You are being called — answer with your whole being and rise.', shadow: 'Self-doubt and refusal to heed your calling keep you in unnecessary suffering.' },
  { id: 21, name: 'The World',          number: 'XXI',  arcana: 'major', symbol: '🌍', element: 'Earth', planet: 'Saturn',  keywords: ['Completion', 'Wholeness', 'Cosmic integration'],      meaning: 'You have danced the full circle of experience and emerged with mastery. This cycle is gloriously complete — celebrate before the next begins.', shadow: 'Incompletion and refusal to integrate lessons delay the wholeness awaiting you.' },
];

const buildMinorArcana = (): TarotCard[] => {
  const suits = [
    {
      name: 'Wands', element: 'Fire', symbol: '🔥',
      theme: 'passion, creativity, ambition',
      cards: [
        { n: 'Ace',    num: 'A',    kw: ['Creative spark', 'New vision', 'Inspired potential'],   m: 'A burst of creative fire ignites a new passion or venture. Seize this inspired moment.', s: 'Delays and lack of direction dull the spark of potential.' },
        { n: 'Two',    num: '2',    kw: ['Planning', 'Future vision', 'Bold ambition'],            m: 'Stand at the threshold of new horizons with bold clarity. Your vision is ready to expand.', s: 'Fear of the unknown keeps you frozen with a world of potential in your hands.' },
        { n: 'Three',  num: '3',    kw: ['Expansion', 'Foresight', 'Overseas ventures'],          m: 'Your efforts are bearing fruit on the horizon. Expansion and long-distance success approach.', s: 'Lack of foresight and missed opportunities limit your expanding potential.' },
        { n: 'Four',   num: '4',    kw: ['Celebration', 'Harmony', 'Stable foundation'],          m: 'A period of joyful celebration and communal harmony. Enjoy what your efforts have built.', s: 'Lack of support or community disrupts what should be a joyful transition.' },
        { n: 'Five',   num: '5',    kw: ['Conflict', 'Competition', 'Creative tension'],           m: 'Creative tension and competition sharpen your abilities. Use conflict as fuel for growth.', s: 'Destructive arguments and avoiding necessary conflict stall your progress.' },
        { n: 'Six',    num: '6',    kw: ['Victory', 'Recognition', 'Public success'],              m: 'Your efforts have earned public recognition and well-deserved success. Accept your triumph.', s: 'Pride before the fall — arrogance undermines your genuine achievements.' },
        { n: 'Seven',  num: '7',    kw: ['Perseverance', 'Defending position', 'Courage'],         m: 'Stand your ground against all challenges. Your position is worth defending — persist.', s: 'Defensiveness and exhaustion make you doubt a position that is actually worth holding.' },
        { n: 'Eight',  num: '8',    kw: ['Speed', 'Rapid movement', 'News arriving'],              m: 'Events accelerate with breathtaking speed. Swift communication and fast movement bring results.', s: 'Hasty decisions and misdirected energy scatter your focus and delay outcomes.' },
        { n: 'Nine',   num: '9',    kw: ['Resilience', 'Last stand', 'Guarded strength'],          m: 'You have come far and faced much. Draw on your deepest reserves — the finish line is near.', s: 'Paranoia and excessive defensiveness exhaust you before the final push.' },
        { n: 'Ten',    num: '10',   kw: ['Burden', 'Responsibility', 'Completion'],                m: 'You carry a heavy load but the journey is nearly complete. Delegate where you can.', s: 'Refusing to release burdens that no longer serve you crushes your spirit needlessly.' },
        { n: 'Page',   num: 'Page', kw: ['Enthusiasm', 'New ideas', 'Creative messenger'],         m: 'A passionate messenger arrives with creative news or a fresh approach. Embrace new ideas.', s: 'Scattered energy and lack of follow-through waste this burst of creative potential.' },
        { n: 'Knight', num: 'Knt',  kw: ['Adventure', 'Impulsive action', 'Passionate charge'],   m: 'Bold action and passionate pursuit drive you forward. Move swiftly toward your vision.', s: 'Recklessness and impulsive behavior sabotage the very goals you are chasing.' },
        { n: 'Queen',  num: 'Qn',   kw: ['Confidence', 'Creative mastery', 'Warm leadership'],    m: 'Lead with authentic confidence and creative mastery. Your warmth draws others to your vision.', s: 'Jealousy and selfish ambition undermine the genuine power and warmth you possess.' },
        { n: 'King',   num: 'Kg',   kw: ['Visionary leadership', 'Entrepreneurship', 'Charisma'], m: 'Command your domain with visionary leadership and bold entrepreneurial spirit. Inspire others.', s: 'Impulsiveness and tyrannical control alienate the very people who would help you succeed.' },
      ],
    },
    {
      name: 'Cups', element: 'Water', symbol: '💧',
      theme: 'emotions, relationships, intuition',
      cards: [
        { n: 'Ace',    num: 'A',    kw: ['New love', 'Emotional opening', 'Spiritual gift'],       m: 'The cup of divine love overflows — a new emotional beginning or spiritual awakening graces you.', s: 'Emotional repression and closed heart block the love that seeks to enter.' },
        { n: 'Two',    num: '2',    kw: ['Partnership', 'Mutual attraction', 'Soul connection'],   m: 'A beautiful union of two souls — romantic partnership or deep friendship deepens with grace.', s: 'Mismatched values and imbalanced connection create disharmony in relationship.' },
        { n: 'Three',  num: '3',    kw: ['Celebration', 'Friendship', 'Community joy'],            m: 'Celebrate with your beloved community. Friendship, joy and shared abundance flow freely.', s: 'Overindulgence and superficiality hollow out what should be genuine celebration.' },
        { n: 'Four',   num: '4',    kw: ['Contemplation', 'Apathy', 'Inner reflection'],           m: 'A divine offering awaits your attention, yet you look inward. Lift your gaze — a gift is here.', s: 'Boredom and self-absorption prevent you from seeing the blessings being offered.' },
        { n: 'Five',   num: '5',    kw: ['Grief', 'Loss', 'Necessary mourning'],                   m: 'Allow yourself to grieve what has been lost, then turn to see what still remains. Healing comes.', s: 'Dwelling in grief and regret blinds you to the gifts that still stand beside you.' },
        { n: 'Six',    num: '6',    kw: ['Nostalgia', 'Childhood joy', 'Innocent gifts'],          m: 'Sweet memories and innocent gifts from the past offer comfort and clarity for your present path.', s: 'Living in the past and idealizing what was keeps you from the joy available now.' },
        { n: 'Seven',  num: '7',    kw: ['Fantasy', 'Wishful thinking', 'Illusion of choice'],    m: 'Dreams are potent seeds, but discernment is needed. Choose one vision and commit fully to it.', s: 'Illusion and wishful thinking lead to a dazzling confusion of unfulfilled dreams.' },
        { n: 'Eight',  num: '8',    kw: ['Walking away', 'Seeking deeper meaning', 'Courage'],    m: 'It takes great courage to walk away from what no longer feeds your soul. Seek what truly matters.', s: 'Fear of change keeps you standing in shallow waters when the deep awaits you.' },
        { n: 'Nine',   num: '9',    kw: ['Contentment', 'Emotional fulfillment', 'Wishes granted'],m: 'Your deepest wish is being granted. A period of profound emotional contentment and satisfaction.', s: 'Complacency and over-indulgence mistake momentary pleasure for genuine fulfillment.' },
        { n: 'Ten',    num: '10',   kw: ['Lasting happiness', 'Family harmony', 'Soulful home'],  m: 'True and lasting emotional happiness crowns your journey. Family harmony and divine love surround you.', s: 'Misaligned values and dysfunctional patterns shatter what should be a paradise.' },
        { n: 'Page',   num: 'Page', kw: ['Dreamy intuition', 'Creative imagination', 'Psychic news'],m: 'A sensitive and intuitive message arrives. Pay attention to dreams and psychic impressions.', s: 'Emotional immaturity and unrealistic fantasies cloud your natural intuitive gifts.' },
        { n: 'Knight', num: 'Knt',  kw: ['Romance', 'Charming pursuit', 'Emotional intelligence'], m: 'Romance and emotional depth sweep you off your feet. A charming and sensitive soul approaches.', s: 'Moodiness and emotionally manipulative behavior damage genuine connections.' },
        { n: 'Queen',  num: 'Qn',   kw: ['Emotional wisdom', 'Psychic gifts', 'Compassionate heart'],m: 'Deep emotional intelligence and psychic sensitivity guide you with compassion and grace.', s: 'Emotional instability and martyrdom drain the wellspring of your considerable gifts.' },
        { n: 'King',   num: 'Kg',   kw: ['Emotional mastery', 'Wise counsel', 'Diplomatic heart'], m: 'Mastery of emotion combined with wisdom makes you a powerful and compassionate guide for others.', s: 'Emotional manipulation and moodiness undermine the authority you have rightfully earned.' },
      ],
    },
    {
      name: 'Swords', element: 'Air', symbol: '💨',
      theme: 'intellect, truth, communication',
      cards: [
        { n: 'Ace',    num: 'A',    kw: ['Mental clarity', 'Breakthrough truth', 'Decisive force'], m: 'A sword of absolute clarity cuts through confusion. Truth prevails and a new mental chapter begins.', s: 'Cruelty and misuse of mental power bring unnecessary pain and destruction.' },
        { n: 'Two',    num: '2',    kw: ['Stalemate', 'Difficult choice', 'Temporary peace'],      m: 'A difficult decision requires you to face what you have been avoiding. Seek inner truth before acting.', s: 'Information overload and avoidance of a necessary choice paralyze you.' },
        { n: 'Three',  num: '3',    kw: ['Heartbreak', 'Sorrow', 'Painful truth'],                 m: 'A painful truth or sorrow must be acknowledged and felt fully before healing can begin.', s: 'Dwelling in negativity and self-pity extends the pain far beyond its natural season.' },
        { n: 'Four',   num: '4',    kw: ['Rest', 'Recovery', 'Strategic retreat'],                  m: 'Step back, rest and allow your mind to recover. Strategic stillness prepares you for what comes next.', s: 'Restlessness and refusal to rest depletes the mental reserves needed for your journey.' },
        { n: 'Five',   num: '5',    kw: ['Conflict', 'Defeat', 'Hollow victory'],                  m: 'Not every battle is worth winning. Choose your fights wisely and consider the cost of victory.', s: 'Ruthless and underhanded behavior wins the battle but destroys your integrity.' },
        { n: 'Six',    num: '6',    kw: ['Transition', 'Moving forward', 'Calmer waters'],          m: 'Moving toward calmer waters after turbulence. A transition brings much-needed peace and clarity.', s: 'Reluctance to leave the familiar delays your passage to the peace that awaits.' },
        { n: 'Seven',  num: '7',    kw: ['Strategy', 'Deception', 'Cunning plan'],                 m: 'Strategic thinking is required. Be clever but stay ethical — cunning without integrity backfires.', s: 'Deceit and cutting corners undermine your position and erode hard-earned trust.' },
        { n: 'Eight',  num: '8',    kw: ['Restriction', 'Self-imposed limits', 'Mental prison'],   m: 'The cage you are in exists largely in your mind. Challenge the stories that keep you bound.', s: 'Victim mentality and self-imposed restrictions keep you trapped when escape is possible.' },
        { n: 'Nine',   num: '9',    kw: ['Anxiety', 'Nightmares', 'Mental anguish'],              m: 'The mind creates its own torments in the dark. Name your fears — most will dissolve in the light.', s: 'Excessive worry and shame spiral into mental suffering that is greater than the actual problem.' },
        { n: 'Ten',    num: '10',   kw: ['Painful ending', 'Crisis point', 'Rock bottom reveals'],  m: 'A painful ending marks the absolute lowest point — from here, the only direction is upward.', s: 'Refusing to acknowledge the depth of a situation prevents the healing that follows.' },
        { n: 'Page',   num: 'Page', kw: ['Curious mind', 'New ideas', 'Truthful message'],         m: 'A sharp, curious mind seeks truth and communicates directly. Mental agility serves you well now.', s: 'Gossip and using words as weapons betray the gift of clear communication you possess.' },
        { n: 'Knight', num: 'Knt',  kw: ['Swift action', 'Intellectual charge', 'Direct truth'],   m: 'Move swiftly and decisively with the truth of your conviction. Speed and clarity are your allies.', s: 'Aggression and brutal bluntness create enemies where allies would better serve.' },
        { n: 'Queen',  num: 'Qn',   kw: ['Sharp intellect', 'Honest perception', 'Independent mind'],m: 'Clear-eyed and fiercely independent, your sharp perception cuts through illusion with grace.', s: 'Cold judgement and bitterness create isolation where connection is deeply needed.' },
        { n: 'King',   num: 'Kg',   kw: ['Intellectual authority', 'Ethical leadership', 'Clarity'], m: 'Command with the authority of clear thinking and ethical principles. Truth is your highest law.', s: 'Manipulation and tyrannical judgment abuse the considerable mental authority you hold.' },
      ],
    },
    {
      name: 'Pentacles', element: 'Earth', symbol: '🌍',
      theme: 'material world, finances, health',
      cards: [
        { n: 'Ace',    num: 'A',    kw: ['Material abundance', 'New prosperity', 'Grounded opportunity'],  m: 'A golden seed of material abundance is planted. A new financial or physical opportunity flourishes.', s: 'Greed and missed opportunity squander the material blessings being offered.' },
        { n: 'Two',    num: '2',    kw: ['Juggling priorities', 'Adaptability', 'Financial balance'],       m: 'You are skillfully managing multiple material priorities. Stay adaptable and trust your balance.', s: 'Poor time management and financial imbalance create chaos in your material world.' },
        { n: 'Three',  num: '3',    kw: ['Collaboration', 'Mastery', 'Skilled work recognized'],           m: 'Your craft and collaborative spirit are recognized. Working together with others amplifies success.', s: 'Lack of teamwork and mediocre work undermine the skill you are genuinely capable of showing.' },
        { n: 'Four',   num: '4',    kw: ['Security', 'Conservation', 'Protective holding'],               m: 'Hold onto what you have built, but do not let fear turn protection into stagnation.', s: 'Hoarding and excessive control over resources block the natural flow of abundance.' },
        { n: 'Five',   num: '5',    kw: ['Financial loss', 'Hardship', 'Spiritual poverty'],              m: 'A difficult period of material lack tests your resourcefulness. Help exists if you seek it.', s: 'Pride prevents you from accepting the help that is available — reach out before suffering deepens.' },
        { n: 'Six',    num: '6',    kw: ['Generosity', 'Giving and receiving', 'Charitable abundance'],   m: 'Abundance flows most freely when it is shared. Give generously and receive with gratitude.', s: 'Strings-attached giving and power imbalances corrupt what should be pure generosity.' },
        { n: 'Seven',  num: '7',    kw: ['Patience', 'Long-term investment', 'Assessing growth'],         m: 'Step back and assess what your efforts have truly produced. Patience is your greatest investment.', s: 'Impatience and poorly directed effort produce disappointing returns on your investment.' },
        { n: 'Eight',  num: '8',    kw: ['Skill mastery', 'Diligent craft', 'Dedication'],               m: 'Mastery comes through dedicated practice. Commit to your craft fully and excellence follows.', s: 'Perfectionism and workaholic tendencies drain the joy from work that should bring satisfaction.' },
        { n: 'Nine',   num: '9',    kw: ['Luxury', 'Self-sufficiency', 'Refined abundance'],              m: 'You have earned your independence and comfort through disciplined effort. Enjoy the harvest.', s: 'Shallow materialism and working without pleasure hollow out the abundance you have created.' },
        { n: 'Ten',    num: '10',   kw: ['Legacy', 'Generational wealth', 'Lasting material success'],    m: 'Enduring prosperity and family legacy crown your material journey. What you build will last.', s: 'Family conflict over wealth and financial pressure threaten what should be a lasting foundation.' },
        { n: 'Page',   num: 'Page', kw: ['Practical learning', 'New material chapter', 'Studious spirit'],m: 'A diligent student energy brings fresh practical opportunities. Learn with patient dedication.', s: 'Procrastination and lack of practical commitment waste the material opportunity at hand.' },
        { n: 'Knight', num: 'Knt',  kw: ['Methodical progress', 'Reliable action', 'Practical quest'],   m: 'Move steadily and reliably toward your material goals. Consistency over brilliance wins now.', s: 'Stagnation and overly cautious behavior prevent the material progress you are capable of making.' },
        { n: 'Queen',  num: 'Qn',   kw: ['Practical nurturing', 'Financial wisdom', 'Grounded abundance'],m: 'Manage material resources with wisdom, warmth and practical nurturing. Security flows from you.', s: 'Financial insecurity and excessive practicality rob life of the richness it deserves.' },
        { n: 'King',   num: 'Kg',   kw: ['Material mastery', 'Abundant leadership', 'Earthly wisdom'],   m: 'Command your material domain with wisdom and generosity. Lasting prosperity is your legacy.', s: 'Corruption and materialism for its own sake undermine the enduring wealth you could build.' },
      ],
    },
  ];

  let id = 22;
  const cards: TarotCard[] = [];

  suits.forEach(suit => {
    suit.cards.forEach(c => {
      cards.push({
        id: id++,
        name: `${c.n} of ${suit.name}`,
        number: c.num,
        arcana: 'minor',
        suit: suit.name,
        symbol: suit.symbol,
        keywords: c.kw,
        meaning: c.m,
        shadow: c.s,
        element: suit.element,
      });
    });
  });

  return cards;
};

export const MINOR_ARCANA = buildMinorArcana();
export const ALL_CARDS: TarotCard[] = [...MAJOR_ARCANA, ...MINOR_ARCANA];

export const shuffleDeck = (cards: TarotCard[]): TarotCard[] => {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const drawCards = (count: number): TarotCard[] => {
  return shuffleDeck(ALL_CARDS).slice(0, count);
};

/** Maps a QuestionSelectScene category label to its image-folder key under /images/tarot/cards/ */
export const CATEGORY_IMAGE_KEYS: Record<string, string> = {
  'Career': 'career',
  'Love': 'love',
  'Marriage': 'marriage',
  'Business': 'business',
  'Finance': 'finance',
  'Health': 'health',
  'Life Purpose': 'lifepurpose',
};

/** Each category has its own re-illustrated art for the 22 Major Arcana cards, numbered 01.png-22.png. */
export const getCategoryCardImage = (category: string | undefined, card: TarotCard): string | null => {
  if (!category || card.arcana !== 'major') return null;
  const key = CATEGORY_IMAGE_KEYS[category];
  if (!key) return null;
  const num = String(card.id + 1).padStart(2, '0');
  return `/images/tarot/cards/${key}/${num}.png`;
};
