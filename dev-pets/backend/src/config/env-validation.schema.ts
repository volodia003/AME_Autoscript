import * as Joi from "joi"

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().equal("DEVELOPMENT", "PRODUCTION").required(),
    GITHUB_CLIENT_ID: Joi.string().required(),
    GITHUB_CLIENT_SECRET: Joi.string().required(),
    GITHUB_REDIRECT_URL: Joi.string().uri().required(),
    GOOGLE_CLIENT_ID: Joi.string().required(),
    GOOGLE_CLIENT_SECRET: Joi.string().required(),
    GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(3306).required(),
    DB_USER: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
})

export function validate(env: Record<string, unknown>) {
    const { error, value: validatedEnv } = envValidationSchema.validate(env, {
        abortEarly: false,
        allowUnknown: true,
    })
    if (error) {
        throw new Error(`Environment validation error: ${error.message}`)
    }
    return validatedEnv
}
