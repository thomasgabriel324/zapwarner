import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Using relative import with extension as per ESM standards in TS
import { getRandomMessage } from "./src/lib/messageBank.ts";

const SETTINGS_FILE = "./settings.json";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Load state from file or defaults
  let settings = {
    evolutionUrl: "",
    evolutionApiKey: "",
    intervalMin: 5,
    intervalMax: 15,
    isActive: false,
  };

  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      settings = { ...settings, ...saved };
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }

  const saveSettings = () => {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  };

  let instances: any[] = [];
  let logs: any[] = [];
  let maturationData: Record<string, { sent: number, received: number, score: number, lastInteracted: string }> = {};

  // Load maturation data if exists
  const MATURATION_FILE = "./maturation.json";
  if (fs.existsSync(MATURATION_FILE)) {
    try {
      maturationData = JSON.parse(fs.readFileSync(MATURATION_FILE, 'utf-8'));
    } catch (e) {}
  }

  const saveMaturation = () => {
    fs.writeFileSync(MATURATION_FILE, JSON.stringify(maturationData, null, 2));
  };

  // Track conversation rounds to ensure all-to-all
  let pairsQueue: { from: string, to: string }[] = [];

  // API Routes
  app.get("/api/settings", (req, res) => {
    res.json(settings);
  });

  app.post("/api/settings", (req, res) => {
    settings = { ...settings, ...req.body };
    saveSettings();
    res.json(settings);
  });

  app.get("/api/instances", (req, res) => {
    // Add maturation metrics to instance list
    const enrichedInstances = instances.map(inst => {
      const name = inst.instance.instanceName;
      const metrics = maturationData[name] || { sent: 0, received: 0, score: 0, lastInteracted: "" };
      return { ...inst, metrics };
    });
    res.json(enrichedInstances);
  });

  app.get("/api/logs", (req, res) => {
    res.json(logs);
  });

  // Background Worker
  let workerTimer: NodeJS.Timeout | null = null;

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const log = { id: Date.now(), timestamp: new Date().toISOString(), message, type };
    logs.unshift(log);
    if (logs.length > 100) logs.pop();
  };

  const fetchInstances = async () => {
    if (!settings.evolutionUrl || !settings.evolutionApiKey) return;
    try {
      const url = settings.evolutionUrl.replace(/\/$/, '');
      const response = await axios.get(`${url}/instance/fetchInstances`, {
        headers: { apikey: settings.evolutionApiKey }
      });
      instances = response.data;
    } catch (error: any) {
      addLog(`Erro ao buscar instâncias: ${error.message}`, 'error');
    }
  };

  const simulateTyping = async (fromInstance: string, toJid: string) => {
    try {
      const url = settings.evolutionUrl.replace(/\/$/, '');
      await axios.post(`${url}/chat/sendPresence/${fromInstance}`, {
        number: toJid,
        presence: "composing"
      }, {
        headers: { apikey: settings.evolutionApiKey }
      });
    } catch (e) {}
  };

  const sendMessage = async (fromInstanceId: string, toJid: string, text: string) => {
    try {
      const url = settings.evolutionUrl.replace(/\/$/, '');
      
      // Simulate human behavior: Typing...
      await simulateTyping(fromInstanceId, toJid);
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));

      await axios.post(`${url}/message/sendText/${fromInstanceId}`, {
        number: toJid,
        options: { delay: 1000, presence: "composing", linkPreview: false },
        textMessage: { text }
      }, {
        headers: { apikey: settings.evolutionApiKey }
      });
      
      // Update metrics for Sender
      if (!maturationData[fromInstanceId]) maturationData[fromInstanceId] = { sent: 0, received: 0, score: 0, lastInteracted: "" };
      maturationData[fromInstanceId].sent++;
      maturationData[fromInstanceId].score += 0.5;
      maturationData[fromInstanceId].lastInteracted = new Date().toISOString();

      // Find the receiver instance to update metrics if it's one of ours
      const receiver = instances.find(i => i.instance.owner === toJid || i.instance.instanceName === toJid);
      if (receiver) {
        const toName = receiver.instance.instanceName;
        if (!maturationData[toName]) maturationData[toName] = { sent: 0, received: 0, score: 0, lastInteracted: "" };
        maturationData[toName].received++;
        maturationData[toName].score += 1.2; // Receiving counts more for maturity
        maturationData[toName].lastInteracted = new Date().toISOString();
      }

      saveMaturation();
      addLog(`Sucesso: ${fromInstanceId} -> ${toJid}`, 'success');
      return true;
    } catch (error: any) {
      addLog(`Falha no envio (${fromInstanceId}): ${error.response?.data?.message || error.message}`, 'error');
      return false;
    }
  };

  const generatePairsQueue = (connected: any[]) => {
    const newQueue: { from: string, to: string }[] = [];
    for (let i = 0; i < connected.length; i++) {
        for (let j = 0; j < connected.length; j++) {
            if (i === j) continue;
            newQueue.push({
                from: connected[i].instance.instanceName,
                to: connected[i].instance.owner || connected[i].instance.instanceName
            });
            // Also the inverse
            newQueue.push({
                from: connected[j].instance.instanceName,
                to: connected[i].instance.owner || connected[i].instance.instanceName
            });
        }
    }
    // Shuffle the queue to be more random
    return newQueue.sort(() => Math.random() - 0.5);
  };

  const runMaturator = async () => {
    if (!settings.isActive) {
      workerTimer = setTimeout(runMaturator, 5000);
      return;
    }
    
    await fetchInstances();
    const connected = instances.filter(i => i.instance.status === 'open');
    
    if (connected.length < 2) {
      addLog("Aguardando ao menos 2 chips conectados...", "info");
      workerTimer = setTimeout(runMaturator, 30000);
      return;
    }

    // Refresh queue if empty or instances changed
    if (pairsQueue.length === 0) {
      addLog("Gerando nova rodada de conversas entre todos os chips...", "info");
      pairsQueue = generatePairsQueue(connected);
    }

    const currentPair = pairsQueue.shift();
    if (currentPair) {
      const message = getRandomMessage();
      await sendMessage(currentPair.from, currentPair.to, message);
    }

    // Random interval spread
    const min = settings.intervalMin || 1;
    const max = settings.intervalMax || 5;
    const intervalMs = (Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000;
    
    addLog(`Descansando... Próxima ação em ${Math.round(intervalMs/60000)} min`, 'info');
    workerTimer = setTimeout(runMaturator, intervalMs);
  };

  // Start worker
  runMaturator();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
