// Next.js 14 instrumentation hook — runs once when the server process starts,
// before it handles any HTTP request. We use it to warm the MongoDB connection
// so the first real visitor doesn't pay the Atlas TCP + TLS handshake cost.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { connectDB } = await import('./app/lib/mongodb');
    connectDB().catch((err: Error) => {
      console.error('[startup] MongoDB warmup failed:', err.message);
    });
  }
}
