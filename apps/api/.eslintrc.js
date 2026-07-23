module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  root: true,
  env: { node: true, jest: true },
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    // Permite destructuring para excluir campos antes de pasar el resto a un
    // repositorio (ej. sacar requestingRoleName/companyId de un patch de Prisma)
    // sin tener que usar cada variable descartada.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      // Regla dura de Clean Architecture: domain/ no puede importar infraestructura ni Nest.
      // Se activa solo para domain/ (en vez de desactivarla en el resto) para que carpetas
      // nuevas no queden desprotegidas por omisión ni bloqueadas por error.
      files: ['**/domain/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@nestjs/*', '@prisma/*', '**/infrastructure/*'],
                message:
                  'domain/ no puede depender de frameworks ni de infraestructura (ver docs/ARQUITECTURA.md).',
              },
            ],
          },
        ],
      },
    },
  ],
};
