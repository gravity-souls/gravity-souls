// ─── SBTI — Silly Big Personality Test ────────────────────────────────────────
// Original by Bilibili @蛆肉儿串儿 · adapted for Driftverse (MIT)

// ─── Dimension keys ────────────────────────────────────────────────────────────

export type DimKey =
  | 'S1' | 'S2' | 'S3'
  | 'E1' | 'E2' | 'E3'
  | 'A1' | 'A2' | 'A3'
  | 'Ac1' | 'Ac2' | 'Ac3'
  | 'So1' | 'So2' | 'So3'

export type DimScore = 'L' | 'M' | 'H'

export const DIMENSION_ORDER: DimKey[] = [
  'S1','S2','S3',
  'E1','E2','E3',
  'A1','A2','A3',
  'Ac1','Ac2','Ac3',
  'So1','So2','So3',
]

// ─── Dimension metadata ─────────────────────────────────────────────────────────

export interface DimMeta {
  name: string       // Chinese label, e.g. "S1 自尊自信"
  model: string      // Chinese model name
  enName: string     // English short name
  enModel: string    // English model group
}

export const DIM_META: Record<DimKey, DimMeta> = {
  S1:  { name: 'S1 自尊自信',   model: '自我模型',     enName: 'Self-worth',    enModel: 'Self' },
  S2:  { name: 'S2 自我清晰度', model: '自我模型',     enName: 'Self-clarity',  enModel: 'Self' },
  S3:  { name: 'S3 核心价值',   model: '自我模型',     enName: 'Core drive',    enModel: 'Self' },
  E1:  { name: 'E1 依恋安全感', model: '情感模型',     enName: 'Security',      enModel: 'Emotion' },
  E2:  { name: 'E2 情感投入度', model: '情感模型',     enName: 'Depth',         enModel: 'Emotion' },
  E3:  { name: 'E3 边界与依赖', model: '情感模型',     enName: 'Space',         enModel: 'Emotion' },
  A1:  { name: 'A1 世界观倾向', model: '态度模型',     enName: 'Trust',         enModel: 'Attitude' },
  A2:  { name: 'A2 规则与灵活度',model: '态度模型',    enName: 'Flexibility',   enModel: 'Attitude' },
  A3:  { name: 'A3 人生意义感', model: '态度模型',     enName: 'Purpose',       enModel: 'Attitude' },
  Ac1: { name: 'Ac1 动机导向',  model: '行动驱力模型', enName: 'Motivation',    enModel: 'Action' },
  Ac2: { name: 'Ac2 决策风格',  model: '行动驱力模型', enName: 'Decisiveness',  enModel: 'Action' },
  Ac3: { name: 'Ac3 执行模式',  model: '行动驱力模型', enName: 'Execution',     enModel: 'Action' },
  So1: { name: 'So1 社交主动性',model: '社交模型',     enName: 'Openness',      enModel: 'Social' },
  So2: { name: 'So2 人际边界感',model: '社交模型',     enName: 'Boundary',      enModel: 'Social' },
  So3: { name: 'So3 表达与真实度',model:'社交模型',    enName: 'Authenticity',  enModel: 'Social' },
}

export const DIM_EXPLANATIONS: Record<DimKey, Record<DimScore, string>> = {
  S1:  { L: '对自己下手比别人还狠，夸你两句你都想先验明真伪。', M: '自信值随天气波动，顺风能飞，逆风先缩。', H: '心里对自己大致有数，不太会被路人一句话打散。' },
  S2:  { L: '内心频道雪花较多，常在"我是谁"里循环缓存。', M: '平时还能认出自己，偶尔也会被情绪临时换号。', H: '对自己的脾气、欲望和底线都算门儿清。' },
  S3:  { L: '更在意舒服和安全，没必要天天给人生开冲刺模式。', M: '想上进，也想躺会儿，价值排序经常内部开会。', H: '很容易被目标、成长或某种重要信念推着往前。' },
  E1:  { L: '感情里警报器灵敏，已读不回都能脑补到大结局。', M: '一半信任，一半试探，感情里常在心里拉锯。', H: '更愿意相信关系本身，不会被一点风吹草动吓散。' },
  E2:  { L: '感情投入偏克制，心门不是没开，是门禁太严。', M: '会投入，但会给自己留后手，不至于全盘梭哈。', H: '一旦认定就容易认真，情绪和精力都给得很足。' },
  E3:  { L: '容易黏人也容易被黏，关系里的温度感很重要。', M: '亲密和独立都要一点，属于可调节型依赖。', H: '空间感很重要，再爱也得留一块属于自己的地。' },
  A1:  { L: '看世界自带防御滤镜，先怀疑，再靠近。', M: '既不天真也不彻底阴谋论，观望是你的本能。', H: '更愿意相信人性和善意，遇事不急着把世界判死刑。' },
  A2:  { L: '规则能绕就绕，舒服和自由往往排在前面。', M: '该守的时候守，该变通的时候也不死磕。', H: '秩序感较强，能按流程来就不爱即兴炸场。' },
  A3:  { L: '意义感偏低，容易觉得很多事都像在走过场。', M: '偶尔有目标，偶尔也想摆烂，人生观处于半开机。', H: '做事更有方向，知道自己大概要往哪边走。' },
  Ac1: { L: '做事先考虑别翻车，避险系统比野心更先启动。', M: '有时想赢，有时只想别麻烦，动机比较混合。', H: '更容易被成果、成长和推进感点燃。' },
  Ac2: { L: '做决定前容易多转几圈，脑内会议常常超时。', M: '会想，但不至于想死机，属于正常犹豫。', H: '拍板速度快，决定一下就不爱回头磨叽。' },
  Ac3: { L: '执行力和死线有深厚感情，越晚越像要觉醒。', M: '能做，但状态看时机，偶尔稳偶尔摆。', H: '推进欲比较强，事情不落地心里都像卡了根刺。' },
  So1: { L: '社交启动慢热，主动出击这事通常得攒半天气。', M: '有人来就接，没人来也不硬凑，社交弹性一般。', H: '更愿意主动打开场子，在人群里不太怕露头。' },
  So2: { L: '关系里更想亲近和融合，熟了就容易把人划进内圈。', M: '既想亲近又想留缝，边界感看对象调节。', H: '边界感偏强，靠太近会先本能性后退半步。' },
  So3: { L: '表达更直接，心里有啥基本不爱绕。', M: '会看气氛说话，真实和体面通常各留一点。', H: '对不同场景的自我切换更熟练，真实感会分层发放。' },
}

// ─── Question types ─────────────────────────────────────────────────────────────

export interface SbtiOption {
  label: string
  value: number
}

export interface SbtiQuestion {
  id: string
  dim: DimKey
  text: string
  options: SbtiOption[]
}

export interface SbtiSpecialQuestion {
  id: string
  special: true
  kind: 'drink_gate' | 'drink_trigger'
  text: string
  options: SbtiOption[]
}

// ─── Questions (30 main) ────────────────────────────────────────────────────────

export const QUESTIONS: SbtiQuestion[] = [
  {
    id: 'q1', dim: 'S1',
    text: '我不够好，这辈子好像没什么特别出彩的地方，胆怯又自卑——每次看到别人光鲜亮丽，都像是对我的一次拷问。',
    options: [
      { label: '我哭了……', value: 1 },
      { label: '这是什么……', value: 2 },
      { label: '这不是我！', value: 3 },
    ],
  },
  {
    id: 'q2', dim: 'S1',
    text: '我不够好，周围的人都比我优秀。',
    options: [
      { label: '确实', value: 1 },
      { label: '有时', value: 2 },
      { label: '不是', value: 3 },
    ],
  },
  {
    id: 'q3', dim: 'S2',
    text: '我很清楚真正的自己是什么样的。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
  {
    id: 'q4', dim: 'S2',
    text: '我内心有真正追求的东西。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
  {
    id: 'q5', dim: 'S3',
    text: '我一定要不断往上爬、变得更厉害。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
  {
    id: 'q6', dim: 'S3',
    text: '外人的评价对我来说无所谓。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
  {
    id: 'q7', dim: 'E1',
    text: '对象超过5小时没回消息，说自己窜稀了，你会怎么想？',
    options: [
      { label: '拉稀不可能5小时，也许ta隐瞒了我。', value: 1 },
      { label: '在信任和怀疑之间摇摆。', value: 2 },
      { label: '也许今天ta真的不太舒服。', value: 3 },
    ],
  },
  {
    id: 'q8', dim: 'E1',
    text: '我在感情里经常担心被对方抛弃。',
    options: [
      { label: '是的', value: 1 },
      { label: '偶尔', value: 2 },
      { label: '不是', value: 3 },
    ],
  },
  {
    id: 'q9', dim: 'E2',
    text: '我对天发誓，我对待每一份感情都是认真的！',
    options: [
      { label: '并没有', value: 1 },
      { label: '也许？', value: 2 },
      { label: '是的！（问心无愧骄傲脸）', value: 3 },
    ],
  },
  {
    id: 'q10', dim: 'E2',
    text: '你的恋爱对象是一个非常优秀的人，此时你会？',
    options: [
      { label: '就算ta再优秀我也不会陷入太深。', value: 1 },
      { label: '会介于两者之间。', value: 2 },
      { label: '会非常珍惜ta，也许会变成恋爱脑。', value: 3 },
    ],
  },
  {
    id: 'q11', dim: 'E3',
    text: '恋爱后，对象非常黏人，你作何感想？',
    options: [
      { label: '那很爽了', value: 1 },
      { label: '都行无所谓', value: 2 },
      { label: '我更喜欢保留独立空间', value: 3 },
    ],
  },
  {
    id: 'q12', dim: 'E3',
    text: '我在任何关系里都很重视个人空间。',
    options: [
      { label: '我更喜欢依赖与被依赖', value: 1 },
      { label: '看情况', value: 2 },
      { label: '是的！（斩钉截铁地说道）', value: 3 },
    ],
  },
  {
    id: 'q13', dim: 'A1',
    text: '大多数人是善良的。',
    options: [
      { label: '其实邪恶的人心比世界上的痔疮更多。', value: 1 },
      { label: '也许吧。', value: 2 },
      { label: '是的，我愿相信好人更多。', value: 3 },
    ],
  },
  {
    id: 'q14', dim: 'A1',
    text: '你走在街上，一位萌萌的小女孩递给你一根棒棒糖，此时你作何感想？',
    options: [
      { label: '呜呜她真好真可爱！居然给我棒棒糖！', value: 3 },
      { label: '一脸懵逼，作挠头状', value: 2 },
      { label: '这也许是一种新型诈骗？还是走开为好。', value: 1 },
    ],
  },
  {
    id: 'q15', dim: 'A2',
    text: '快考试了，学校规定必须上晚自习，但今晚你约了心仪的人一起玩游戏，你怎么办？',
    options: [
      { label: '翘了！反正就一次！', value: 1 },
      { label: '干脆请个假吧。', value: 2 },
      { label: '都快考试了还去啥。', value: 3 },
    ],
  },
  {
    id: 'q16', dim: 'A2',
    text: '我喜欢打破常规，不喜欢被束缚。',
    options: [
      { label: '认同', value: 1 },
      { label: '保持中立', value: 2 },
      { label: '不认同', value: 3 },
    ],
  },
  {
    id: 'q17', dim: 'A3',
    text: '我做事通常有目标。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
  {
    id: 'q18', dim: 'A3',
    text: '突然某一天，我意识到人生哪有什么意义，人不过是和动物一样被各种欲望支配着。',
    options: [
      { label: '是这样的。', value: 1 },
      { label: '也许是，也许不是。', value: 2 },
      { label: '这简直是胡扯', value: 3 },
    ],
  },
  {
    id: 'q19', dim: 'Ac1',
    text: '我做事主要为了取得成果和进步，而不是避免麻烦和风险。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
  {
    id: 'q20', dim: 'Ac1',
    text: '你因便秘坐在马桶上（已长达30分钟），拉不出很难受。此时你更想……',
    options: [
      { label: '再坐三十分钟看看，说不定就有了。', value: 1 },
      { label: '用力拍打自己的屁股并说：快拉啊！', value: 2 },
      { label: '使用开塞露，快点拉出来才好。', value: 3 },
    ],
  },
  {
    id: 'q21', dim: 'Ac2',
    text: '我做决定比较果断，不喜欢犹豫。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
  {
    id: 'q22', dim: 'Ac2',
    text: '此题没有题目，请盲选。',
    options: [
      { label: '反复思考后感觉应该选A？', value: 1 },
      { label: '啊，要不选B？', value: 2 },
      { label: '不会就选C？', value: 3 },
    ],
  },
  {
    id: 'q23', dim: 'Ac3',
    text: '别人说你"执行力强"，你内心更接近哪句？',
    options: [
      { label: '我被逼到最后确实执行力超强……', value: 1 },
      { label: '啊，有时候吧。', value: 2 },
      { label: '是的，事情本来就该被推进', value: 3 },
    ],
  },
  {
    id: 'q24', dim: 'Ac3',
    text: '我做事常常有计划，____',
    options: [
      { label: '然而计划不如变化快。', value: 1 },
      { label: '有时能完成，有时不能。', value: 2 },
      { label: '我讨厌被打破计划。', value: 3 },
    ],
  },
  {
    id: 'q25', dim: 'So1',
    text: '你因玩游戏结识了许多网友，并被邀请线下见面，你的想法是？',
    options: [
      { label: '网上口嗨下就算了，真见面还是有点忐忑。', value: 1 },
      { label: '见网友也挺好，反正谁来聊我就聊两句。', value: 2 },
      { label: '我会打扮一番并热情聊天，万一呢？', value: 3 },
    ],
  },
  {
    id: 'q26', dim: 'So1',
    text: '朋友带了ta的朋友一起来玩，你最可能的状态是',
    options: [
      { label: '对"朋友的朋友"天然有点距离感', value: 1 },
      { label: '看对方，能玩就玩。', value: 2 },
      { label: '朋友的朋友应该也算我的朋友！要热情聊天', value: 3 },
    ],
  },
  {
    id: 'q27', dim: 'So2',
    text: '我和人相处主打一个电子围栏，靠太近会自动报警。',
    options: [
      { label: '认同', value: 3 },
      { label: '中立', value: 2 },
      { label: '不认同', value: 1 },
    ],
  },
  {
    id: 'q28', dim: 'So2',
    text: '我渴望和我信任的人关系密切，熟得像失散多年的亲戚。',
    options: [
      { label: '认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '不认同', value: 3 },
    ],
  },
  {
    id: 'q29', dim: 'So3',
    text: '有时候你明明对一件事有不同的、负面的看法，但最后没说出来。多数情况下原因是：',
    options: [
      { label: '这种情况较少。', value: 1 },
      { label: '可能碍于情面或者关系。', value: 2 },
      { label: '不想让别人知道自己是个阴暗的人。', value: 3 },
    ],
  },
  {
    id: 'q30', dim: 'So3',
    text: '我在不同人面前会表现出不一样的自己。',
    options: [
      { label: '不认同', value: 1 },
      { label: '中立', value: 2 },
      { label: '认同', value: 3 },
    ],
  },
]

// ─── Special / hidden questions ─────────────────────────────────────────────────

export const SPECIAL_QUESTIONS: SbtiSpecialQuestion[] = [
  {
    id: 'drink_gate',
    special: true,
    kind: 'drink_gate',
    text: '您平时有什么爱好？',
    options: [
      { label: '吃喝拉撒', value: 1 },
      { label: '艺术爱好', value: 2 },
      { label: '饮酒', value: 3 },
      { label: '健身', value: 4 },
    ],
  },
  {
    id: 'drink_trigger',
    special: true,
    kind: 'drink_trigger',
    text: '您对饮酒的态度是？',
    options: [
      { label: '小酌怡情，喝不了太多。', value: 1 },
      { label: '我习惯将白酒灌在保温杯，当白开水喝，酒精令我信服。', value: 2 },
    ],
  },
]

// ─── Personality types ───────────────────────────────────────────────────────────

export interface SbtiType {
  code: string
  cn: string
  intro: string
  desc: string
}

export const TYPE_LIBRARY: Record<string, SbtiType> = {
  CTRL: {
    code: 'CTRL', cn: '拿捏者',
    intro: '怎么样，被我拿捏了吧？',
    desc: '恭喜您测出了全中国最为罕见的人格，您是宇宙熵增定律的天然反对者！CTRL人格是行走的人形自走任务管理器，普通人眼中的"规则"，在您这里只是出厂的基础参数设置。拥有一个CTRL朋友意味着什么？意味着你的人生导航系统会变得更加精准、高效。CTRL会在你人生列车即将脱轨的前一秒，用一个"Ctrl+S"帮你硬核存档，再用一套无法拒绝的逻辑把你强行拽回正轨。',
  },
  'ATM-er': {
    code: 'ATM-er', cn: '送钱者',
    intro: '你以为我很有钱吗？',
    desc: '恭喜您测出了这个世界上最稀有的人格。ATM-er不一定真的"送钱"，但可能永远在"支付"。支付时间、支付精力、支付耐心、支付一个本该安宁的夜晚。像一部老旧但坚固的ATM机，插进去的是别人的焦虑和麻烦，吐出来的是"没事，有我"的安心保证。您的人生就是一场盛大的、无人喝彩的单人付账秀。',
  },
  'Dior-s': {
    code: 'Dior-s', cn: '屌丝',
    intro: '等着我屌丝逆袭。',
    desc: '您是犬儒主义先贤第欧根尼失散多年的精神传人，因为屌丝的全称是 Diogenes\' Original Realist-sage。Dior-s人格，是对当代消费主义陷阱和成功学PUA最彻底的蔑视。他们不是"不求上进"，而是早已看穿一切"上进"的尽头不过是更高级的牢房。当别人在追逐风口，被时代的巨浪拍得七荤八素时，Dior-s早已在自己的精神木桶里晒着太阳，达到了"人桶合一"的至高境界。',
  },
  BOSS: {
    code: 'BOSS', cn: '领导者',
    intro: '方向盘给我，我来开。',
    desc: 'BOSS是一个手里永远拿着方向盘的人。哪怕油箱已经亮了红灯，哪怕导航在胡说八道，你都会面无表情地说一句：我来开。然后真的把车开到了目的地。效率是他们的信仰，秩序是他们的呼吸。他们不是"自带领袖气场"，他们本身就是人形的气场发生器，方圆五米内，空气都会自动变得严肃而高效。',
  },
  'THAN-K': {
    code: 'THAN-K', cn: '感恩者',
    intro: '我感谢苍天！我感谢大地！',
    desc: '恭喜您测出了全中国最为罕见的人格。您应当感谢我！THAN-K拥有温润如玉的性格和海纳百川的胸怀。他们眼中的世界没有完全的坏人，只有"尚未被感恩光芒照耀到的朋友"。拥有一个THAN-K朋友，就像身边多了一个永不枯竭的正能量发射塔。TA甚至能帮你从墙角的霉斑里发现一幅梵高风格的星空图。',
  },
  'OH-NO': {
    code: 'OH-NO', cn: '哦不人',
    intro: '哦不！我怎么会是这个人格？！',
    desc: '"哦不！"并非恐惧的尖叫，而是一种顶级的智慧。哦不人对"边界"有一种近乎偏执的尊重：你的就是你的，我的就是我的。所有意外和风险都已经在他的"Oh, no!"声中，被扼杀在了萌芽状态。他们是秩序的守护神，是混乱世界里最后那批神经绷得很直的体面人。',
  },
  GOGO: {
    code: 'GOGO', cn: '行者',
    intro: 'gogogo~出发咯',
    desc: 'GOGO活在一个极致的"所见即所得"世界里，人生信条简单粗暴到令人发指。他们不是在"解决问题"，他们是在"清除待办事项"。对他们来说，世界上只有两种状态：已完成，和即将被我完成。别人还在为"先有鸡还是先有蛋"而辩论，GOGO行者已经把鸡和蛋一起做成了终极奥义盖浇饭。',
  },
  SEXY: {
    code: 'SEXY', cn: '尤物',
    intro: '您就是天生的尤物！',
    desc: '当您走进一个房间，照明系统会自动将您识别为天生的尤物，并自觉调暗亮度，以避免能源浪费。无论是谁，都容易对您的存在产生一种超标的注意力。传说，如果有足够多的SEXY人格聚集在一起开派对，其释放出的综合魅力能量足以暂时扭曲时空结构。',
  },
  'LOVE-R': {
    code: 'LOVE-R', cn: '多情者',
    intro: '爱意太满，现实显得有点贫瘠。',
    desc: 'LOVE-R人格像远古神话时代幸存至今的珍稀物种。您的情感处理器不是二进制的，而是彩虹制的。一片落叶，在常人眼里只是"秋天来了"，在LOVE-R眼中，则是一场关于轮回、牺牲与无言之爱的十三幕悲喜剧。您内心世界像一座永不关门的主题公园，一生都在寻找那个能看懂园区地图的灵魂伴侣。',
  },
  MUM: {
    code: 'MUM', cn: '妈妈',
    intro: '或许……我可以叫你妈妈吗……？',
    desc: '恭喜您测出了全中国最稀有的妈妈人格。妈妈人格的底色是温柔，擅长感知情绪，具有超强共情力，知道什么时候该停下来，什么时候该对自己说一句"算了"。妈妈像一个医生，治愈了别人的不开心。只可惜，MUM对自己的温柔，常常打了折。',
  },
  FAKE: {
    code: 'FAKE', cn: '伪人',
    intro: '已经，没有人类了。',
    desc: '在社交场合，伪人是八面玲珑的存在，因为他们切换人格面具比切换手机输入法还快。你以为你交到了一个真心懂你的朋友？醒醒。你只是幸运地遇到了一个善于伪装的仿生人罢了。夜深人静时，伪人把面具一层层摘下来，最后才发现，面具下空得很，正是这些面具构成了自己。',
  },
  OJBK: {
    code: 'OJBK', cn: '无所谓人',
    intro: '我说随便，是真的随便。',
    desc: '这已经不是一种人格，而是一种统治哲学。当凡人面临"中午吃米饭还是面条"的世纪抉择时，大脑在激烈燃烧；而OJBK人格，会用一种批阅奏章般的淡然，轻飘飘地吐出两个字：都行。这不是没主见，这是在告诉你：尔等凡俗的选择，于朕而言，皆为蝼蚁。',
  },
  MALO: {
    code: 'MALO', cn: '吗喽',
    intro: '人生是个副本，而我只是一只吗喽。',
    desc: '朋友，你的灵魂还停留在那个挂在树上荡秋千、看见香蕉就两眼放光的快乐时代。吗喽看透了一切：所谓的"文明"，不过是一场最无聊、最不好玩的付费游戏。规则偶尔是可以打破的，天花板是用来倒挂的，会议室是用来表演后空翻的。MALO本身就是一个从巨大脑洞里掉出来、忘了关门的奇思妙想。',
  },
  'JOKE-R': {
    code: 'JOKE-R', cn: '小丑',
    intro: '原来我们都是小丑。',
    desc: 'JOKE-R是社交场合的气氛组组长兼唯一指定火力输出。有他们在，场子就不会冷。你一层层打开，直到最后，发现最里面……是空的，只剩下一点微弱的回声在说：哈，没想到吧。用最大的笑声，盖住心碎的声音。',
  },
  'WOC!': {
    code: 'WOC!', cn: '握草人',
    intro: '卧槽，我怎么是这个人格？',
    desc: 'WOC!人拥有两种完全独立的操作系统：一个叫"表面系统"，负责发出"我操""牛逼""啊？"等一系列大惊小怪的拟声词；另一个叫"后台系统"，负责冷静分析：嗯，果然不出我所料。WOC!人选择握着一根智慧的大草，用一声饱含深情的"WOC！"来为这个疯狂的世界献上最高敬意。',
  },
  'THIN-K': {
    code: 'THIN-K', cn: '思考者',
    intro: '已深度思考100s。',
    desc: '您的大脑长时间处于思考状态。您十分会审判信息，注重论点、论据、逻辑推理。在这个信息爆炸的时代，您绝不会轻易盲从，会在关系中衡量利弊，也十分捍卫自己的自我空间。当别人看到您独处时在发呆？愚蠢——那是您的大脑正在对今天接收到的所有信息进行分类、归档和销毁。',
  },
  SHIT: {
    code: 'SHIT', cn: '愤世者',
    intro: '这个世界，构石一坨。',
    desc: 'SHIT的行为模式是一场惊天动地的悖论戏剧。嘴上：这个项目简直是屎。手上：默默打开 Excel，开始建模型。嘴上：这帮同事都是 shit。手上：在同事搞砸之后，一边烦着，一边熬夜把烂摊子收拾干净。别怕，那不是世界末日的警报，那是他马上要开始拯救世界的冲锋号。',
  },
  ZZZZ: {
    code: 'ZZZZ', cn: '装死者',
    intro: '我没死，我只是在睡觉。',
    desc: '群里99+条消息您可以视而不见，但当有人发出"@全体成员还有半小时就截止了"的最后通牒时，您会像刚从千年古墓里苏醒一样，在29分钟内交出一份及格的答卷。直到"死线"这个最高权限的指令出现，不鸣则已，一鸣惊人。您向宇宙证明了一个真理：有时什么都不做，就不会做错。',
  },
  POOR: {
    code: 'POOR', cn: '贫困者',
    intro: '我穷，但我很专。',
    desc: 'POOR的世界很简单：不重要的东西一律降噪，重要的东西狠狠干到底。你不是资源少，你是把资源全部灌进了一个坑里，所以看起来像贫困，实际上像矿井。一旦某件事被你认定值得钻，外界再吵也只是背景杂音。',
  },
  MONK: {
    code: 'MONK', cn: '僧人',
    intro: '没有那种世俗的欲望。',
    desc: 'MONK已然看破红尘，不希望闲人来扰其清修、破其道行。MONK的个人空间，是他们的结界，是他们的须弥山，是他们的绝对领域，神圣不可侵犯。他们不黏不缠，因为在他们的世界观里，行星与行星之间保持着亿万公里的距离，才构成和谐宇宙，人与人之间为什么不行？',
  },
  IMSB: {
    code: 'IMSB', cn: '傻者',
    intro: '认真的么？我真的是傻逼么？',
    desc: 'IMSB人格的大脑里住着两个不死不休的究极战士：一个叫"我他妈冲了！"，另一个叫"我是个傻逼！"。当IMSB面对一个有好感的人时，前者说：冲啊！后者接着说：人家凭什么看得上你？最终结果：盯着对方背影直到消失，然后掏出手机搜索"如何克服社交恐惧症"。',
  },
  SOLO: {
    code: 'SOLO', cn: '孤儿',
    intro: '我哭了，我怎么会是孤儿？',
    desc: '孤儿的自我价值感偏低，因此有时主动疏远他人，在灵魂外围建起了一座名为"莫挨老子"的万里长城。每一块砖，都是过去的一道伤口。孤儿就像一只把所有软肋都藏起来，然后用最硬的刺对着世界的刺猬。那满身的尖刺不是攻击，那是一句句说不出口的"别过来，我怕你也受伤"。',
  },
  FUCK: {
    code: 'FUCK', cn: '草者',
    intro: '操！这是什么人格？',
    desc: '在FUCK的世界观里，世俗规则简直毫无意义，情绪开关是物理拨片式的：FUCK YEAH 和 FUCK OFF。FUCK追求的不只是当下快感，也在追求一种在体内横冲直撞的生命力。当所有人都被驯化成了温顺家禽，FUCK则是荒野上最后那一声狼嚎。',
  },
  DEAD: {
    code: 'DEAD', cn: '死者',
    intro: '我，还活着吗？',
    desc: '（Don\'t Expect Any Drives）死者已经看透了那些无意义的哲学思考，因此显得对一切"失去"了兴趣。死者们看世界的眼神，就像一位顶级玩家通关了所有主线，删档重开了999次之后，终于发现：这游戏压根就没意思。死者是超越了欲望和目标的终极贤者。',
  },
  IMFW: {
    code: 'IMFW', cn: '废物',
    intro: '我真的……是废物吗？',
    desc: '废物们的自尊通常有些脆弱，缺乏安全感，因此能精确地感知到周围最强的可靠信号。给废物一颗糖，他们会还你一个完全信任你、亮晶晶的眼神。你未必是废物，你只是太没防备，太容易认真。',
  },
  HHHH: {
    code: 'HHHH', cn: '傻乐者',
    intro: '哈哈哈哈哈哈。',
    desc: '由于您的思维回路过于清奇，标准人格库已全面崩溃。第一人格匹配率只有60%以下时，系统才会为您强制匹配这个人格——【HHHH - 傻乐者】。这个人格有什么特质？哈哈哈哈哈哈哈哈哈哈哈哈！对不起，这就是全部的特质了。也许您可以查看十五维度进行不专业的评估……哈哈哈哈哈哈。',
  },
  DRUNK: {
    code: 'DRUNK', cn: '酒鬼',
    intro: '烈酒烧喉，不得不醉。',
    desc: '您体内流淌的不是血液，是美味的白酒！是国窖1573！是江小白！它让您在饭桌上谈笑风生，在厕所里抱着马桶忏悔人生；它让您觉得自己是夜场诗人，是宇宙中心那团不灭的火，直到第二天上午十点，您的头像裂开的核桃，嘴角挂着食物残渣，灵魂缩在角落里。您终于明白——昨晚那个高谈阔论、拍桌怒吼的人，已经成为了一个酒鬼。',
  },
}

// ─── Normal type patterns (for matching) ─────────────────────────────────────────
// Each pattern = S1S2S3-E1E2E3-A1A2A3-Ac1Ac2Ac3-So1So2So3

export const NORMAL_TYPES: { code: string; pattern: string }[] = [
  { code: 'CTRL',   pattern: 'HHH-HMH-MHH-HHH-MHM' },
  { code: 'ATM-er', pattern: 'HHH-HHM-HHH-HMH-MHL' },
  { code: 'Dior-s', pattern: 'MHM-MMH-MHM-HMH-LHL' },
  { code: 'BOSS',   pattern: 'HHH-HMH-MMH-HHH-LHL' },
  { code: 'THAN-K', pattern: 'MHM-HMM-HHM-MMH-MHL' },
  { code: 'OH-NO',  pattern: 'HHL-LMH-LHH-HHM-LHL' },
  { code: 'GOGO',   pattern: 'HHM-HMH-MMH-HHH-MHM' },
  { code: 'SEXY',   pattern: 'HMH-HHL-HMM-HMM-HLH' },
  { code: 'LOVE-R', pattern: 'MLH-LHL-HLH-MLM-MLH' },
  { code: 'MUM',    pattern: 'MMH-MHL-HMM-LMM-HLL' },
  { code: 'FAKE',   pattern: 'HLM-MML-MLM-MLM-HLH' },
  { code: 'OJBK',   pattern: 'MMH-MMM-HML-LMM-MML' },
  { code: 'MALO',   pattern: 'MLH-MHM-MLH-MLH-LMH' },
  { code: 'JOKE-R', pattern: 'LLH-LHL-LML-LLL-MLM' },
  { code: 'WOC!',   pattern: 'HHL-HMH-MMH-HHM-LHH' },
  { code: 'THIN-K', pattern: 'HHL-HMH-MLH-MHM-LHH' },
  { code: 'SHIT',   pattern: 'HHL-HLH-LMM-HHM-LHH' },
  { code: 'ZZZZ',   pattern: 'MHL-MLH-LML-MML-LHM' },
  { code: 'POOR',   pattern: 'HHL-MLH-LMH-HHH-LHL' },
  { code: 'MONK',   pattern: 'HHL-LLH-LLM-MML-LHM' },
  { code: 'IMSB',   pattern: 'LLM-LMM-LLL-LLL-MLM' },
  { code: 'SOLO',   pattern: 'LML-LLH-LHL-LML-LHM' },
  { code: 'FUCK',   pattern: 'MLL-LHL-LLM-MLL-HLH' },
  { code: 'DEAD',   pattern: 'LLL-LLM-LML-LLL-LHM' },
  { code: 'IMFW',   pattern: 'LLH-LHL-LML-LLL-MLL' },
]

// ─── Colour accents per type (for UI) ─────────────────────────────────────────────

export const TYPE_COLORS: Record<string, string> = {
  CTRL:    '#a78bfa',
  'ATM-er':'#60a5fa',
  'Dior-s':'#94a3b8',
  BOSS:    '#f59e0b',
  'THAN-K':'#34d399',
  'OH-NO': '#fb923c',
  GOGO:    '#f87171',
  SEXY:    '#f472b6',
  'LOVE-R':'#e879f9',
  MUM:     '#86efac',
  FAKE:    '#a8a29e',
  OJBK:    '#64748b',
  MALO:    '#fbbf24',
  'JOKE-R':'#f97316',
  'WOC!':  '#38bdf8',
  'THIN-K':'#818cf8',
  SHIT:    '#dc2626',
  ZZZZ:   '#6b7280',
  POOR:    '#d97706',
  MONK:    '#4ade80',
  IMSB:   '#a3e635',
  SOLO:   '#e0e0e0',
  FUCK:   '#ef4444',
  DEAD:   '#475569',
  IMFW:   '#c084fc',
  HHHH:   '#facc15',
  DRUNK:  '#f97316',
}
