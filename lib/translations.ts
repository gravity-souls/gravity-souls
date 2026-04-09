import type { Language } from '@/contexts/language-context'

export type TranslationKey =
  | 'app.name'
  | 'nav.discover'
  | 'nav.create'
  | 'hero.eyebrow'
  | 'hero.title'
  | 'hero.subtitle.1'
  | 'hero.subtitle.2'
  | 'hero.cta.primary'
  | 'hero.cta.secondary'
  | 'feature.growth'
  | 'feature.growth.desc'
  | 'feature.resonance'
  | 'feature.resonance.desc'
  | 'feature.explore'
  | 'feature.explore.desc'
  | 'feature.cta'
  | 'create.title'
  | 'create.subtitle'
  | 'create.text.placeholder'
  | 'create.mood.label'
  | 'discover.title'
  | 'discover.subtitle'
  | 'nav.myUniverse'
  | 'myuniverse.label'
  | 'myuniverse.empty.title'
  | 'myuniverse.empty.subtitle'
  | 'myuniverse.empty.cta'
  | 'nav.myPlanet'
  | 'nav.stream'
  | 'stream.title'
  | 'stream.subtitle'
  | 'myplanet.label'
  | 'myplanet.empty.title'
  | 'myplanet.empty.subtitle'
  | 'myplanet.empty.cta'

type Translations = Record<Language, Record<TranslationKey, string>>

const translations: Translations = {
  en: {
    'app.name':                'Gravity-Souls',
    'nav.discover':            'Discover',
    'nav.create':              'Create',
    'hero.eyebrow':            'Personal universe engine',
    'hero.title':              'Your inner universe, mapped.',
    'hero.subtitle.1':         'Express yourself. Discover who resonates. Meet what you have never considered. Begin the drift.',
    'hero.subtitle.2':         'No accounts. No algorithms judging you. Just the shape of what you truly are.',
    'hero.cta.primary':        'Begin your drift',
    'hero.cta.secondary':      'See a universe',
    'feature.growth':          'Map Your Inner Universe',
    'feature.growth.desc':     'Express yourself in any form — text, mood, fragments. Gravity-Souls reads the shape of what you share and connects you with kindred spirits.',
    'feature.resonance':       'Find Your Kind',
    'feature.resonance.desc':  'Discover universes that feel like yours. Not based on what you like, but on how you think, what you sense, and where you drift when no one is watching.',
    'feature.explore':         'Explore the Distance',
    'feature.explore.desc':    'The most interesting encounters live at the edge. Find universes far from yours — not to change, but to understand what you are by seeing what you are not.',
    'feature.cta':             'Create your universe →',
    'create.title':            'Shape your universe',
    'create.subtitle':         'Write anything. A feeling, a fragment, a half-thought. There is no wrong answer.',
    'create.text.placeholder': 'A feeling at 3am. A recurring image. The texture of a thought you can\'t quite name. Begin anywhere.',
    'create.mood.label':       'Current frequency',
    'discover.title':            'Universes matched to Velaris-9',
    'discover.subtitle':         'Five encounters across the drift, grouped by the nature of the pull. Each one is a different kind of mirror.',
    'nav.myUniverse':            'My Universe',
    'myuniverse.label':          'My Universe',
    'myuniverse.empty.title':    'Your universe is uncharted',
    'myuniverse.empty.subtitle': 'You haven\'t shaped a universe yet. Begin with a few words — anything you feel, see, or carry.',
    'myuniverse.empty.cta':      'Create my universe',
    'nav.myPlanet':              'My Planet',
    'nav.stream':                'Stream',
    'stream.title':              'Planets in drift',
    'stream.subtitle':           'Each planet is a mind in motion. Click to enter a universe and discover your resonance with it.',
    'myplanet.label':            'My Planet',
    'myplanet.empty.title':      'Your planet has not formed yet',
    'myplanet.empty.subtitle':   'Create your universe first — your planet emerges from the same expression.',
    'myplanet.empty.cta':        'Begin the formation',
  },

  'zh-CN': {
    'app.name':                'Gravity-Souls',
    'nav.discover':            '探索',
    'nav.create':              '创建',
    'hero.eyebrow':            '个人宇宙引擎',
    'hero.title':              '你的内在宇宙，已被绘制成图。',
    'hero.subtitle.1':         '表达自我。发现与你共鸣的人。遇见你从未想象的存在。开始漂流。',
    'hero.subtitle.2':         '无需账号。没有算法评判你。只有你真实模样所呈现的形状。',
    'hero.cta.primary':        '开始漂流',
    'hero.cta.secondary':      '查看宇宙示例',
    'feature.growth':          '绘制你的内在宇宙',
    'feature.growth.desc':     '以任何形式表达自我——文字、情绪、碎片。Gravity-Souls 解读你所分享内容的形状，连接你与志同道合的灵魂。',
    'feature.resonance':       '寻找你的同类',
    'feature.resonance.desc':  '发现感觉像你的宇宙。不基于你喜欢什么，而是基于你如何思考、感知什么，以及当无人注视时你会漂向何处。',
    'feature.explore':         '探索远方',
    'feature.explore.desc':    '最有趣的相遇存在于边缘地带。寻找远离你的宇宙——不是为了改变自己，而是通过看见你不是什么来理解你是什么。',
    'feature.cta':             '创建你的宇宙 →',
    'create.title':            '塑造你的宇宙',
    'create.subtitle':         '写下任何内容。一种感觉，一个片段，一个半成型的想法。没有错误的答案。',
    'create.text.placeholder': '凌晨三点的某种感觉。一个反复出现的意象。一个你无法完全命名的想法质感。从任何地方开始。',
    'create.mood.label':       '当前频率',
    'discover.title':            '与 Velaris-9 匹配的宇宙',
    'discover.subtitle':         '穿越漂流的五次相遇，按引力的性质分组。每一个都是不同的镜子。',
    'nav.myUniverse':            '我的宇宙',
    'myuniverse.label':          '我的宇宙',
    'myuniverse.empty.title':    '你的宇宙尚未绘制',
    'myuniverse.empty.subtitle': '你还没有塑造一个宇宙。以几个词开始——任何你感受到的、看见的或承载的。',
    'myuniverse.empty.cta':      '创建我的宇宙',
    'nav.myPlanet':              '我的星球',
    'nav.stream':                '星流',
    'stream.title':              '漂流中的星球',
    'stream.subtitle':           '每个星球都是一个运动中的思维。点击进入一个宇宙，发现你与它的共鸣。',
    'myplanet.label':            '我的星球',
    'myplanet.empty.title':      '你的星球尚未形成',
    'myplanet.empty.subtitle':   '先创建你的宇宙——你的星球从同一表达中涌现。',
    'myplanet.empty.cta':        '开始形成',
  },
}

export function t(lang: Language, key: TranslationKey): string {
  return translations[lang]?.[key] ?? translations['en'][key] ?? key
}
