import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';
import {
  getAllBooks, addBook, updateBook, deleteBook,
  getAllFranchises, addFranchise, updateFranchise, deleteFranchise,
  getUserProfile, setUserProfile,
  searchBooksDictionary, saveToBooksDictionary
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getLocalIP(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

export async function startServer(port: number = 3456, isDev: boolean = false) {
  let expressModule: any;
  try {
    expressModule = await import('express');
  } catch (err: any) {
    console.warn('[LuminaBooks Server] Express is not available, skipping server start:', err?.message || err);
    return null;
  }

  const express = expressModule.default;
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.use((_req: any, res: any, next: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // --- Books API ---
  app.get('/api/books', (_req: any, res: any) => {
    try {
      const books = getAllBooks();
      res.json(books);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/books', (req: any, res: any) => {
    try {
      const book = addBook(req.body);
      res.status(201).json(book);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/books/:id', (req: any, res: any) => {
    try {
      const book = updateBook({ ...req.body, id: req.params.id });
      res.json(book);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete('/api/books/:id', (req: any, res: any) => {
    try {
      deleteBook(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // --- Franchises API ---
  app.get('/api/franchises', (_req: any, res: any) => {
    try {
      const franchises = getAllFranchises();
      res.json(franchises);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/franchises', (req: any, res: any) => {
    try {
      const franchise = addFranchise(req.body);
      res.status(201).json(franchise);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/franchises/:id', (req: any, res: any) => {
    try {
      const franchise = updateFranchise({ ...req.body, id: req.params.id });
      res.json(franchise);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete('/api/franchises/:id', (req: any, res: any) => {
    try {
      deleteFranchise(req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // --- Profile API ---
  app.get('/api/profile', (_req: any, res: any) => {
    try {
      const profile = getUserProfile();
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put('/api/profile', (req: any, res: any) => {
    try {
      setUserProfile(req.body);
      res.json(req.body);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // --- Books Dictionary API ---
  app.get('/api/books-dictionary/search', (req: any, res: any) => {
    try {
      const { title, author } = req.query;
      const results = searchBooksDictionary(title || '', author || '');
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/books-dictionary', (req: any, res: any) => {
    try {
      saveToBooksDictionary(req.body);
      res.status(201).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // --- Health check ---
  app.get('/api/status', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Static files (production only) ---
  if (!isDev) {
    const distPath = join(__dirname, '../dist');
    app.use(express.static(distPath));
    app.use((req: any, res: any, next: any) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(join(distPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  const server = createServer(app);
  const localIP = getLocalIP();
  const serverUrl = `http://${localIP}:${port}`;

  server.listen(port, '0.0.0.0', () => {
    console.log(`[LuminaBooks Server] Running at ${serverUrl}`);
  });

  server.on('error', (err: any) => {
    console.error(`[LuminaBooks Server] Failed to listen on port ${port}:`, err);
    if (err.code === 'EADDRINUSE') {
      console.error(`[LuminaBooks Server] Port ${port} is already in use.`);
    }
  });

  return { server, app: expressModule.default, serverUrl, port };
}
