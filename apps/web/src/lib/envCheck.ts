/**
 * 环境变量验证工具
 * 在应用启动时检查必需的环境变量是否已配置
 */

type EnvConfig = {
  key: string
  required: boolean
  description: string
}

const ENV_VARS: EnvConfig[] = [
  {
    key: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase 项目 URL',
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase 匿名密钥',
  },
  {
    key: 'VITE_AMAP_WEB_KEY',
    required: false,
    description: '高德地图 Web 服务密钥（地图功能需要）',
  },
  {
    key: 'VITE_AMAP_SECURITY_JS_CODE',
    required: false,
    description: '高德地图 JS 安全密钥（启用 Web 安全时需要）',
  },
  {
    key: 'VITE_AMAP_REST_KEY',
    required: false,
    description: '高德地图 REST 服务密钥（地理编码等功能需要）',
  },
  {
    key: 'VITE_IFLYTEK_APP_ID',
    required: false,
    description: '科大讯飞应用 ID（语音功能需要）',
  },
]

/**
 * 检查环境变量配置
 * @returns 验证结果和错误信息
 */
export const checkEnvVariables = (): {
  valid: boolean
  errors: string[]
  warnings: string[]
} => {
  const errors: string[] = []
  const warnings: string[] = []

  ENV_VARS.forEach((config) => {
    const value = import.meta.env[config.key]
    
    if (!value) {
      if (config.required) {
        errors.push(`❌ 缺少必需的环境变量: ${config.key} - ${config.description}`)
      } else {
        warnings.push(`⚠️ 未配置可选环境变量: ${config.key} - ${config.description}`)
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * 在开发环境下打印环境变量检查结果
 */
export const logEnvCheck = (): void => {
  if (!import.meta.env.DEV) return

  const result = checkEnvVariables()

  console.group('🔍 环境变量检查')
  
  if (result.valid) {
    console.log('✅ 所有必需的环境变量已配置')
  } else {
    console.error('❌ 环境变量配置不完整')
    result.errors.forEach((err) => console.error(err))
  }

  if (result.warnings.length > 0) {
    result.warnings.forEach((warning) => console.warn(warning))
  }

  console.groupEnd()
}

/**
 * 在生产环境下验证环境变量，如果缺失则抛出错误
 */
export const validateEnvVariables = (): void => {
  const result = checkEnvVariables()

  if (!result.valid) {
    const errorMessage = [
      '应用配置错误：缺少必需的环境变量',
      ...result.errors,
      '',
      '请检查 .env.local 文件配置',
    ].join('\n')

    throw new Error(errorMessage)
  }
}
