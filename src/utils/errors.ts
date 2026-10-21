export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '操作未完成，请稍后重试。';
}
