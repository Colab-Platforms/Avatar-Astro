import aries from '@/assets/zodiac/aries.png';
import taurus from '@/assets/zodiac/taurus.png';
import gemini from '@/assets/zodiac/gemini.png';
import cancer from '@/assets/zodiac/cancer.png';
import leo from '@/assets/zodiac/leo.png';
import virgo from '@/assets/zodiac/virgo.png';
import libra from '@/assets/zodiac/libra.png';
import scorpio from '@/assets/zodiac/scorpio.png';
import sagittarius from '@/assets/zodiac/sagittarius.png';
import capricorn from '@/assets/zodiac/capricorn.png';
import aquarius from '@/assets/zodiac/aquarius.png';
import pisces from '@/assets/zodiac/pisces.png';

/** Line-art illustration per sign, keyed by capitalised sign name (matches `zodiacSigns[].name`). */
export const zodiacImages: Record<string, string> = {
  Aries: aries, Taurus: taurus, Gemini: gemini, Cancer: cancer, Leo: leo, Virgo: virgo,
  Libra: libra, Scorpio: scorpio, Sagittarius: sagittarius, Capricorn: capricorn, Aquarius: aquarius, Pisces: pisces,
};
