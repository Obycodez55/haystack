/**
 * Faker helper to work around ES module issues in Jest
 * Uses a simple data generator as fallback
 */

// Simple data generator as fallback
function simpleDataGenerator() {
  let counter = 0;
  const randomString = (length: number = 8) => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  };

  return {
    company: {
      name: () => `Test Company ${++counter} ${randomString(4)}`,
    },
    internet: {
      email: () => `test${++counter}${randomString(6)}@example.com`,
    },
    string: {
      alphanumeric: (length: number = 10) => randomString(length),
    },
    location: {
      streetAddress: () => `${counter} ${randomString(4)} Test Street`,
    },
    phone: {
      number: () => `+123456789${String(counter).padStart(3, '0')}`,
    },
  };
}

let fakerInstance: any = null;

export async function getFaker(): Promise<any> {
  if (fakerInstance) {
    return fakerInstance;
  }

  try {
    // Try to use real faker
    // @faker-js/faker v10+ is an ES module, use dynamic import
    // Jest should handle this with proper configuration
    const fakerModule = await import('@faker-js/faker');
    fakerInstance = fakerModule.faker;
    if (!fakerInstance) {
      throw new Error('Faker instance not found in module');
    }
    return fakerInstance;
  } catch (error: any) {
    // Fallback to simple generator if import fails
    // This can happen if Jest doesn't properly transform the ES module
    fakerInstance = simpleDataGenerator();
    return fakerInstance;
  }
}
