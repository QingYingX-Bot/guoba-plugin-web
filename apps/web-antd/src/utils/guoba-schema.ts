const COMPAT_MARKER = '__guobaCompatType';

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMethodFunctionSource(source: string) {
  const trimmed = source.trim();
  if (
    !trimmed
    || trimmed.startsWith('function')
    || trimmed.startsWith('async function')
    || trimmed.includes('=>')
  ) {
    return trimmed;
  }

  const match = trimmed.match(/^(async\s+)?([$\w]+)\s*\(([\s\S]*)$/);
  if (!match) {
    return trimmed;
  }

  const asyncPrefix = match[1] ?? '';
  const functionName = match[2] ?? '';
  const rest = match[3] ?? '';
  return `${asyncPrefix}function ${functionName}(${rest}`;
}

function reviveFunction(source: string) {
  const candidates = [
    source.trim(),
    normalizeMethodFunctionSource(source),
  ].filter(Boolean);

  for (const candidate of new Set(candidates)) {
    try {
      const fn = new Function(`return (${candidate});`)();
      if (typeof fn === 'function') {
        return fn;
      }
    } catch {
      continue;
    }
  }

  return source;
}

export function deserializeGuobaSchemaValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => deserializeGuobaSchemaValue(item)) as T;
  }

  if (!isRecord(value)) {
    return value;
  }

  if (value[COMPAT_MARKER] === 'function' && typeof value.source === 'string') {
    return reviveFunction(value.source) as T;
  }

  if (value[COMPAT_MARKER] === 'regexp' && typeof value.source === 'string') {
    try {
      return new RegExp(value.source, String(value.flags ?? '')) as T;
    } catch {
      return value as T;
    }
  }

  const output: Record<string, any> = {};
  for (const [key, item] of Object.entries(value)) {
    output[key] = deserializeGuobaSchemaValue(item);
  }
  return output as T;
}

