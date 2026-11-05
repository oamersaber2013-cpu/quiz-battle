import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";

const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

export function sanitizeString(input: string): string {
  let sanitized = input.trim();
  
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  
  return sanitized.slice(0, 1000);
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const key in obj) {
      // Credentials are opaque; trimming/truncating them changes what is verified.
      sanitized[key] = ["password", "idToken", "accessToken"].includes(key) && typeof obj[key] === "string"
        ? obj[key] : sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}

export function sanitizeInput(req: FastifyRequest, res: FastifyReply, next: HookHandlerDoneFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_\u0600-\u06FF]{3,20}$/.test(username);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
