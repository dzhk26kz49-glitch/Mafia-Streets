import { Role } from '../store/useAuthStore';
import { 
  Shield, 
  Crown, 
  Flame, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Lock, 
  Briefcase, 
  Zap, 
  EyeOff, 
  Key, 
  FastForward, 
  Compass, 
  Anchor, 
  PackageCheck, 
  Globe2, 
  Skull, 
  Swords, 
  HeartHandshake, 
  Activity 
} from 'lucide-react';

export interface RoleSkillDef {
  id: string;
  role: Role;
  name: string;
  nameEn: string;
  description: string;
  iconName: string;
  maxLevel: number;
  costPerLevel: number; // in Skill Points
  benefitPerLevel: string;
  tier: number; // 1, 2, 3, 4
}

export interface RoleContractTemplate {
  id: string;
  role: Role;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rewardCash: number;
  rewardRep: number;
  rewardSkillPoints: number;
  durationSeconds: number;
}

export const ROLE_SKILL_TREES: Record<Role, {
  title: string;
  subtitle: string;
  color: string;
  bgGradient: string;
  skills: RoleSkillDef[];
}> = {
  Boss: {
    title: 'شجرة الزعامة والسيطرة (Boss Tree)',
    subtitle: 'بسط الهيبة، قيادة العائلات، وتحقيق الهيمنة المطلقة على المدينة',
    color: 'text-red-500',
    bgGradient: 'from-red-600/20 via-zinc-900 to-black',
    skills: [
      {
        id: 'boss_authority',
        role: 'Boss',
        name: 'هيبة الشوارع العليا',
        nameEn: 'Supreme Authority',
        description: 'زيادة احترام الخصوم ومضاعفة كسب نقاط السمعة في جميع المعارك والأنشطة.',
        iconName: 'Crown',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+15% سمعة إضافية و+10% دفاع استراتيجي',
        tier: 1
      },
      {
        id: 'boss_command',
        role: 'Boss',
        name: 'أمر العمليات التكتيكي',
        nameEn: 'Command Operations',
        description: 'تعزيز القوة الهجومية لجميع أفراد العصابة والحراس تحت إمرتك.',
        iconName: 'Shield',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+12% قوة هجومية إضافية في كافة الاشتباكات',
        tier: 2
      },
      {
        id: 'boss_immunity',
        role: 'Boss',
        name: 'شبكة الحصانة والوساطة',
        nameEn: 'Executive Immunity',
        description: 'تقليل احتمالية التعرض للمداهمات وتخفيض مبالغ الكفالات في سجن الدولة.',
        iconName: 'Award',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: 'تقليل غرامات الاعتقال بنسبة 20% وتفادي المداهمات',
        tier: 3
      },
      {
        id: 'boss_spoils',
        role: 'Boss',
        name: 'غنائم النصر الملكية',
        nameEn: 'Spoils of Victory',
        description: 'انتزاع حصة مضاعفة من أموال وغنائم الخصوم عند الفوز في النزاعات.',
        iconName: 'Flame',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: '+25% أموال قذرة ونظيفة من غنائم المعارك',
        tier: 4
      }
    ]
  },

  Trader: {
    title: 'شجرة التجارة والاستثمار (Trader Tree)',
    subtitle: 'مضاعفة التدفقات المالية، احتكار الأسواق، وتأمين الثروات الخفية',
    color: 'text-blue-500',
    bgGradient: 'from-blue-600/20 via-zinc-900 to-black',
    skills: [
      {
        id: 'trader_foresight',
        role: 'Trader',
        name: 'حنكة الأسواق المالية',
        nameEn: 'Market Foresight',
        description: 'مضاعفة أرباح الشركات والعقارات المملوكة وعوائد الاستثمارات اليومية.',
        iconName: 'TrendingUp',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+20% أرباح إضافية من الشركات والممتلكات',
        tier: 1
      },
      {
        id: 'trader_tax_evasion',
        role: 'Trader',
        name: 'التهرب الضريبي الذكي',
        nameEn: 'Tax Evasion',
        description: 'تخفيض عمولات البنوك ورسوم غسيل الأموال في الخزنة السويسرية.',
        iconName: 'DollarSign',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: 'خصم 15% على رسوم غسيل وتحويل الأموال',
        tier: 2
      },
      {
        id: 'trader_fortified_vaults',
        role: 'Trader',
        name: 'الخزائن البنكية المحصنة',
        nameEn: 'Fortified Vaults',
        description: 'تأمين أموالك ضد عمليات السطو وسرقات اللصوص في شوارع المدينة.',
        iconName: 'Lock',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: 'حماية 25% إضافية من الأرصدة ضد السرقة',
        tier: 3
      },
      {
        id: 'trader_monopoly',
        role: 'Trader',
        name: 'الصفقات الاحتكارية',
        nameEn: 'Monopoly Deals',
        description: 'الحصول على خصومات حصرية عند شراء المعدات والعقارات الفاخرة.',
        iconName: 'Briefcase',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: 'خصم 12% على جميع مشتريات السوق والعقارات',
        tier: 4
      }
    ]
  },

  Thief: {
    title: 'شجرة التسلل والسطو (Thief Tree)',
    subtitle: 'اختراق الخزائن البنكية، السرقات الصامتة، والتلاشي في الظلال',
    color: 'text-orange-500',
    bgGradient: 'from-orange-600/20 via-zinc-900 to-black',
    skills: [
      {
        id: 'thief_shadow_fingers',
        role: 'Thief',
        name: 'أصابع الظل المحترفة',
        nameEn: 'Shadow Fingers',
        description: 'رفع نسبة نجاح عمليات السطو وسرقة السيارات والمتاجر في المدينة.',
        iconName: 'Zap',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+15% نسبة نجاح إضافية في جميع السرقات',
        tier: 1
      },
      {
        id: 'thief_alarm_bypass',
        role: 'Thief',
        name: 'تعطيل أنظمة الإنذار',
        nameEn: 'Alarm Bypass',
        description: 'تقليل لفت انتباه الشرطة وتقليل نجوم المطلوبية بعد ارتكاب الجرائم.',
        iconName: 'EyeOff',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: 'تخفيض نجوم المطلوبية واحتمال كشف الهوية بنسبة 20%',
        tier: 2
      },
      {
        id: 'thief_double_loot',
        role: 'Thief',
        name: 'الغنائم المضاعفة',
        nameEn: 'Double Loot',
        description: 'فرصة الحصول على أضعاف الأموال والسبائك المسروقة من الخزائن.',
        iconName: 'Key',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: '+25% فرصة مضاعفة أموال وذهب السطو',
        tier: 3
      },
      {
        id: 'thief_quick_escape',
        role: 'Thief',
        name: 'الفرار الخاطف',
        nameEn: 'Quick Escape',
        description: 'تقليص أوقات الانتظار واستعادة الجاهزية لعملية السطو القادمة.',
        iconName: 'FastForward',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: 'تسريع مدة الانتظار بعد الجرائم بنسبة 30%',
        tier: 4
      }
    ]
  },

  Smuggler: {
    title: 'شجرة التهريب واللوجستيات (Smuggler Tree)',
    subtitle: 'فتح الممرات السرية، الإفلات من الجمارك، والسيطرة على السوق السوداء',
    color: 'text-purple-500',
    bgGradient: 'from-purple-600/20 via-zinc-900 to-black',
    skills: [
      {
        id: 'smuggler_corridors',
        role: 'Smuggler',
        name: 'الممرات السرية الدولية',
        nameEn: 'Covert Corridors',
        description: 'تسريع زمن السفر والتنقل الجوي والبحري بين الدول والمدن.',
        iconName: 'Compass',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: 'تقليص زمن السفر الدولي بنسبة 25%',
        tier: 1
      },
      {
        id: 'smuggler_customs_evasion',
        role: 'Smuggler',
        name: 'التمويه الجمركي',
        nameEn: 'Customs Evasion',
        description: 'حماية البضائع المهربة والممنوعات من المصادرة أثناء التفتيش في المطارات.',
        iconName: 'Anchor',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+20% حماية ضد التفتيش ومصادرة الشحنات',
        tier: 2
      },
      {
        id: 'smuggler_cargo_capacity',
        role: 'Smuggler',
        name: 'توسيع شحنات الظل',
        nameEn: 'Cargo Expansion',
        description: 'زيادة الطاقة الاستيعابية لنقل البضائع والممنوعات في السوق السوداء.',
        iconName: 'PackageCheck',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: '+30% سعة حمولة إضافية للبضائع والممنوعات',
        tier: 3
      },
      {
        id: 'smuggler_black_brokerage',
        role: 'Smuggler',
        name: 'الوساطة في السوق السوداء',
        nameEn: 'Black Brokerage',
        description: 'بيع الممنوعات والشحنات بأسعار مضاعفة وتفاوض احترافي.',
        iconName: 'Globe2',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: '+20% أرباح صافية من تجارة السوق السوداء',
        tier: 4
      }
    ]
  },

  Criminal: {
    title: 'شجرة الإجرام والاشتباك (Criminal Tree)',
    subtitle: 'القتال الشرس، ترهيب العصابات، وتحمل أقسى الضربات والسجون',
    color: 'text-zinc-300',
    bgGradient: 'from-zinc-700/20 via-zinc-900 to-black',
    skills: [
      {
        id: 'crim_iron_fist',
        role: 'Criminal',
        name: 'القبضة الحديدية',
        nameEn: 'Iron Fist',
        description: 'زيادة القوة الهجومية والدفاعية المباشرة في كافة الاشتباكات الدامية.',
        iconName: 'Swords',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+18% هجوم ودفاع قتالي مباشر في المعارك',
        tier: 1
      },
      {
        id: 'crim_prison_resilience',
        role: 'Criminal',
        name: 'صلابة السجون',
        nameEn: 'Prison Resilience',
        description: 'تخفيض مدة البقاء في السجن وسرعة الإفراج القانوني أو الهروب.',
        iconName: 'Skull',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: 'تقليص مدة السجن بنسبة 25%',
        tier: 2
      },
      {
        id: 'crim_intimidation',
        role: 'Criminal',
        name: 'ترهيب الخصوم',
        nameEn: 'Intimidation',
        description: 'إضعاف دفاعات الخصم وكسر معنوياته عند بدء القتال في الشوارع.',
        iconName: 'HeartHandshake',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: 'خفض دفاع الخصم بنسبة 15% عند بدء المعركة',
        tier: 3
      },
      {
        id: 'crim_rapid_recovery',
        role: 'Criminal',
        name: 'الانتعاش الخارق',
        nameEn: 'Rapid Recovery',
        description: 'استعادة الصحة والطاقة القتالية أسرع بكثير بعد الخروج من المستشفى.',
        iconName: 'Activity',
        maxLevel: 5,
        costPerLevel: 2,
        benefitPerLevel: '+35% سرعة استرجاع الطاقة والصحة',
        tier: 4
      }
    ]
  },

  Admin: {
    title: 'شجرة السلطة العليا (Supreme Admin Tree)',
    subtitle: 'صلاحيات الإدارة والتحكم الشامل في توازن قوى عالم المافيا',
    color: 'text-amber-500',
    bgGradient: 'from-amber-600/20 via-zinc-900 to-black',
    skills: [
      {
        id: 'boss_authority',
        role: 'Admin',
        name: 'هيبة الحكم المطلق',
        nameEn: 'Supreme Command',
        description: 'سيطرة تامة وقوة مطلقة في جميع معارك ونزاعات المدينة.',
        iconName: 'Crown',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+25% سمعة وهيبة في كافة قطاعات اللعبة',
        tier: 1
      },
      {
        id: 'trader_foresight',
        role: 'Admin',
        name: 'الخزينة المركزية',
        nameEn: 'Central Treasury',
        description: 'مضاعفة أرباح كافة الاستثمارات والشركات التابعة للإدارة.',
        iconName: 'TrendingUp',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+30% أرباح سيولة مصرفية وعقارية',
        tier: 2
      },
      {
        id: 'thief_shadow_fingers',
        role: 'Admin',
        name: 'اختراق الظل الرقمي',
        nameEn: 'Cyber Bypass',
        description: 'تنفيذ العمليات والمهام دون أي عوائق أمنية.',
        iconName: 'Zap',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: 'تخطي حواجز المداهمات والسجون فوراً',
        tier: 3
      },
      {
        id: 'crim_iron_fist',
        role: 'Admin',
        name: 'الدرع السيادي',
        nameEn: 'Sovereign Aegis',
        description: 'مناعة دفاعية صلبة وقوة رادعة ضد جميع التهديدات.',
        iconName: 'Swords',
        maxLevel: 5,
        costPerLevel: 1,
        benefitPerLevel: '+50% قوة ودفاع شامل في النزاعات',
        tier: 4
      }
    ]
  },

  Random: {
    title: 'شجرة الزعامة والسيطرة',
    subtitle: 'بسط الهيبة وتحقيق الهيمنة المطلقة على المدينة',
    color: 'text-red-500',
    bgGradient: 'from-red-600/20 via-zinc-900 to-black',
    skills: []
  }
};

// Generates role-specific daily contracts
export const ROLE_CONTRACTS_CATALOG: Record<Role, RoleContractTemplate[]> = {
  Boss: [
    {
      id: 'boss_contract_1',
      role: 'Boss',
      title: 'عقد حماية مربع السفارات',
      description: 'نشر حراس النخبة لتأمين حي السفارات وإخضاع العصابات المنافسة في المربع الدبلوماسي.',
      difficulty: 'easy',
      rewardCash: 450000,
      rewardRep: 35,
      rewardSkillPoints: 1,
      durationSeconds: 15
    },
    {
      id: 'boss_contract_2',
      role: 'Boss',
      title: 'تصفية هدف عالي القيمة',
      description: 'تعقب أحد قادة العصابات المتمردة وإصدار أمر تصفية استراتيجي يثبت سيطرتك.',
      difficulty: 'medium',
      rewardCash: 950000,
      rewardRep: 70,
      rewardSkillPoints: 2,
      durationSeconds: 30
    },
    {
      id: 'boss_contract_3',
      role: 'Boss',
      title: 'مؤتمر قادة عائلات الظل',
      description: 'عقد اجتماع سري مع كبار قادة المافيا وتوحيد الرسوم المفروضة على أحياء المدينة.',
      difficulty: 'hard',
      rewardCash: 2200000,
      rewardRep: 150,
      rewardSkillPoints: 2,
      durationSeconds: 60
    }
  ],

  Trader: [
    {
      id: 'trader_contract_1',
      role: 'Trader',
      title: 'صفقة استيراد سيارات فاخرة',
      description: 'تمويل شحنة سيارات رياضية حصرية عبر ميناء دبي وإعادة بيعها لكبار رجال الأعمال.',
      difficulty: 'easy',
      rewardCash: 600000,
      rewardRep: 25,
      rewardSkillPoints: 1,
      durationSeconds: 15
    },
    {
      id: 'trader_contract_2',
      role: 'Trader',
      title: 'غسيل سندات مصرفية كبرى',
      description: 'تحويل سندات مالية مجهولة المصدر عبر شبكة شركات الواجهة وإيداعها في حسابك النظيف.',
      difficulty: 'medium',
      rewardCash: 1250000,
      rewardRep: 50,
      rewardSkillPoints: 2,
      durationSeconds: 30
    },
    {
      id: 'trader_contract_3',
      role: 'Trader',
      title: 'احتكار سوق العقارات التجارية',
      description: 'الاستحواذ على مجمع أبراج تجارية في العاصمة وجني عوائد إيجارية مليونية فورية.',
      difficulty: 'hard',
      rewardCash: 2800000,
      rewardRep: 100,
      rewardSkillPoints: 2,
      durationSeconds: 60
    }
  ],

  Thief: [
    {
      id: 'thief_contract_1',
      role: 'Thief',
      title: 'سرقة مجوهرات الكرادة',
      description: 'التسلل ليلاً إلى متجر مجوهرات فاخر وتعطيل الكاميرات والخروج بكنوز ثمينة.',
      difficulty: 'easy',
      rewardCash: 500000,
      rewardRep: 30,
      rewardSkillPoints: 1,
      durationSeconds: 15
    },
    {
      id: 'thief_contract_2',
      role: 'Thief',
      title: 'اختراق خزنة بنك الاستثمار',
      description: 'استخدام أجهزة ليزر صامتة لفتح صناديق الودائع السرية في قبو البنك المركزي.',
      difficulty: 'medium',
      rewardCash: 1100000,
      rewardRep: 60,
      rewardSkillPoints: 2,
      durationSeconds: 30
    },
    {
      id: 'thief_contract_3',
      role: 'Thief',
      title: 'نهب شاحنة نقل الأموال المصفحة',
      description: 'نصب كمين احترافي لشاحنة نقل الذهب بين المطارات والفرار قبل وصول تعزيزات الشرطة.',
      difficulty: 'hard',
      rewardCash: 2400000,
      rewardRep: 120,
      rewardSkillPoints: 2,
      durationSeconds: 60
    }
  ],

  Smuggler: [
    {
      id: 'smuggler_contract_1',
      role: 'Smuggler',
      title: 'تهريب شحنة أسلحة تكتيكية',
      description: 'تأمين مسار شاحنة أسلحة متطورة عبر المعابر الحدودية وتوصيلها للمستودع السري.',
      difficulty: 'easy',
      rewardCash: 550000,
      rewardRep: 30,
      rewardSkillPoints: 1,
      durationSeconds: 15
    },
    {
      id: 'smuggler_contract_2',
      role: 'Smuggler',
      title: 'شحنة ممنوعات جوية خاصة',
      description: 'استئجار طائرة خاصة للشحن الجوي السريع ونقل مواد كيميائية نادرة دون كشف جمركي.',
      difficulty: 'medium',
      rewardCash: 1200000,
      rewardRep: 65,
      rewardSkillPoints: 2,
      durationSeconds: 30
    },
    {
      id: 'smuggler_contract_3',
      role: 'Smuggler',
      title: 'عملية العبور الكبير عبر المضيق',
      description: 'إدارة قافلة زوارق تهريب بحرية سريعة محملة بسبائك الذهب الخالصة عبر المياه الإقليمية.',
      difficulty: 'hard',
      rewardCash: 2600000,
      rewardRep: 130,
      rewardSkillPoints: 2,
      durationSeconds: 60
    }
  ],

  Criminal: [
    {
      id: 'crim_contract_1',
      role: 'Criminal',
      title: 'تدمير وكر عصابة منافسة',
      description: 'اقتحام معقل أحد التشكيلات المعادية وتدمير معداتهم لفرض السيطرة المطلقة.',
      difficulty: 'easy',
      rewardCash: 480000,
      rewardRep: 35,
      rewardSkillPoints: 1,
      durationSeconds: 15
    },
    {
      id: 'crim_contract_2',
      role: 'Criminal',
      title: 'اشتباك شوارع وحصار مسلح',
      description: 'خوض مواجهة مسلحة حاسمة لكسر طوق أمني وتحرير سجناء محتجزين من أفراد العصابة.',
      difficulty: 'medium',
      rewardCash: 1150000,
      rewardRep: 75,
      rewardSkillPoints: 2,
      durationSeconds: 30
    },
    {
      id: 'crim_contract_3',
      role: 'Criminal',
      title: 'عملية الفوضى الكبرى والسيطرة',
      description: 'شن هجوم منسق شامل على مراكز نفوذ العدو وبسط الهيمنة العسكرية على الحي بأكمله.',
      difficulty: 'hard',
      rewardCash: 2500000,
      rewardRep: 140,
      rewardSkillPoints: 2,
      durationSeconds: 60
    }
  ],

  Admin: [
    {
      id: 'admin_contract_1',
      role: 'Admin',
      title: 'مرسوم أمني سيادي عاجل',
      description: 'إصدار أوامر استخباراتية فورية لضبط موازين القوى في شوارع العاصمة.',
      difficulty: 'easy',
      rewardCash: 1000000,
      rewardRep: 50,
      rewardSkillPoints: 2,
      durationSeconds: 10
    },
    {
      id: 'admin_contract_2',
      role: 'Admin',
      title: 'إعادة ضبط الخزينة المركزية',
      description: 'تحصيل إيرادات وأصول سيادية ضخمة وتغذية أرصدة القيادة العليا.',
      difficulty: 'medium',
      rewardCash: 2500000,
      rewardRep: 100,
      rewardSkillPoints: 3,
      durationSeconds: 20
    },
    {
      id: 'admin_contract_3',
      role: 'Admin',
      title: 'حملة التطهير الشاملة',
      description: 'تنفيذ عملية أمنية واسعة النطاق لردع أي تمرد ضد النظام السياسي وعالم الظل.',
      difficulty: 'hard',
      rewardCash: 5000000,
      rewardRep: 250,
      rewardSkillPoints: 5,
      durationSeconds: 30
    }
  ],

  Random: []
};
