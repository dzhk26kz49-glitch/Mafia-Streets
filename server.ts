import express from 'express';
import http from 'http';
// RULE: All API responses must be JSON. Do not return HTML for API routes.
import admin from 'firebase-admin';
const FieldValue = admin.firestore.FieldValue;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

let genaiClient: GoogleGenAI | null = null;
try {
  genaiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} catch (e) {
  console.warn('GoogleGenAI initialization warning:', e);
}

// Initialize Firebase Admin
let db: any = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (Object.keys(serviceAccount).length > 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT not configured, Firebase Admin not initialized.');
  }
} catch (e) {
  console.error('Error initializing Firebase Admin:', e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Platform health check - MUST respond quickly
  app.get('/__aistudio_internal_control_plane/dev/status', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API routes
  app.get('/api/health', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ status: 'ok' });
  });

  // توليد صور الشخصيات بواسطة Gemini بالاستناد إلى نموذج صورة أو وصف
  app.post('/api/admin/generate-npc-image', async (req, res) => {
    try {
      if (!genaiClient) {
        genaiClient = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      }

      const { 
        prompt, 
        referenceImage, 
        referenceImageUrl, 
        aspectRatio = '3:4', 
        gender = 'male', 
        personality = 'gangster', 
        district = 'الكرادة' 
      } = req.body;

      if (!prompt && !referenceImage && !referenceImageUrl) {
        return res.status(400).json({ error: 'الوصف أو نموذج الصورة مطلوب' });
      }

      const parts: any[] = [];
      let refBase64: string = referenceImage || '';
      let refMime = 'image/jpeg';

      // إذا تم إرسال رابط نموذج صورة (سواء كان محلياً أو خارجياً)
      if (!refBase64 && referenceImageUrl) {
        try {
          let targetUrl = referenceImageUrl;
          if (targetUrl.startsWith('/')) {
            const localPath = path.join(process.cwd(), 'public', targetUrl);
            if (fs.existsSync(localPath)) {
              const fileData = fs.readFileSync(localPath);
              refBase64 = fileData.toString('base64');
              refMime = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
            } else {
              targetUrl = `http://localhost:${PORT}${targetUrl}`;
            }
          }
          if (!refBase64) {
            const fetched = await fetch(targetUrl);
            if (fetched.ok) {
              const ab = await fetched.arrayBuffer();
              refBase64 = Buffer.from(ab).toString('base64');
              refMime = fetched.headers.get('content-type') || 'image/jpeg';
            }
          }
        } catch (fetchErr) {
          console.warn('Could not fetch referenceImageUrl:', fetchErr);
        }
      }

      if (refBase64) {
        const cleanBase64 = refBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: refMime
          }
        });
      }

      // تجهيز برومبت سينمائي دقيق بطابع أزقة المافيا
      let fullPrompt = prompt || '';
      if (refBase64) {
        fullPrompt = `Generate a cinematic, high-detail mafia gangster character portrait matching and evolving the visual style of this reference image. Style: photorealistic, dark gritty criminal underground, authentic Iraqi Baghdad street mafia theme, dramatic chiaroscuro lighting, cinematic shallow depth of field. Gender: ${gender === 'female' ? 'Female (امرأة عراقية)' : 'Male (رجل عراقي)'}, Character role: ${personality}, District: ${district}. ${fullPrompt}`;
      } else {
        fullPrompt = `High-end cinematic portrait of an Iraqi Baghdad mafia underworld character, gritty photorealistic mafia streets style, 8k resolution, dramatic rim lighting, authentic street criminal character aesthetics: ${gender === 'female' ? 'Female' : 'Male'}, ${personality}, ${district}. ${fullPrompt}`;
      }

      parts.push({
        text: fullPrompt
      });

      const allowedAspects = ['1:1', '3:4', '4:3', '9:16', '16:9'];
      const chosenAspect = allowedAspects.includes(aspectRatio) ? aspectRatio : '3:4';

      console.log('Generating NPC image via Gemini (gemini-3.1-flash-lite-image)...');
      const response = await genaiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts
        },
        config: {
          imageConfig: {
            aspectRatio: chosenAspect
          }
        }
      });

      let generatedBase64 = '';
      let generatedMime = 'image/png';
      let generatedText = '';

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedBase64 = part.inlineData.data;
            generatedMime = part.inlineData.mimeType || 'image/png';
          } else if (part.text) {
            generatedText += part.text;
          }
        }
      }

      if (!generatedBase64) {
        throw new Error(generatedText || 'لم يتم استلام بيانات صورة من نموذج Gemini');
      }

      // حفظ الصورة محلياً في مجلد public/images/npcs لتكون متاحة بشكل دائم
      const imagesDir = path.join(process.cwd(), 'public', 'images', 'npcs');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      const ext = generatedMime.includes('jpeg') || generatedMime.includes('jpg') ? 'jpg' : 'png';
      const filename = `npc_gemini_${Date.now()}.${ext}`;
      const destPath = path.join(imagesDir, filename);
      fs.writeFileSync(destPath, Buffer.from(generatedBase64, 'base64'));

      const publicUrl = `/images/npcs/${filename}`;
      const dataUri = `data:${generatedMime};base64,${generatedBase64}`;

      return res.json({
        success: true,
        imageUrl: publicUrl,
        dataUri,
        filename,
        text: generatedText
      });
    } catch (err: any) {
      console.error('Gemini NPC image generation error:', err);
      return res.status(500).json({
        error: err.message || 'حدث خطأ أثناء توليد الصورة بواسطة Gemini'
      });
    }
  });

  // حفظ صورة NPC مخصصة أو مرفوعة من الجهاز
  app.post('/api/admin/save-npc-image', async (req, res) => {
    try {
      const { base64Data, filename: customName } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: 'بيانات الصورة base64Data مطلوبة' });
      }

      const imagesDir = path.join(process.cwd(), 'public', 'images', 'npcs');
      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const ext = base64Data.includes('image/jpeg') ? 'jpg' : 'png';
      const filename = customName ? (customName.endsWith(`.${ext}`) ? customName : `${customName}.${ext}`) : `npc_saved_${Date.now()}.${ext}`;
      const destPath = path.join(imagesDir, filename);

      fs.writeFileSync(destPath, Buffer.from(cleanBase64, 'base64'));
      return res.json({
        success: true,
        imageUrl: `/images/npcs/${filename}`
      });
    } catch (err: any) {
      console.error('Save NPC image error:', err);
      return res.status(500).json({ error: err.message || 'فشل حفظ الصورة' });
    }
  });

  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/png';
      const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;
      res.json({ base64 });
    } catch (error: any) {
      console.error('Proxy image error:', error);
      res.status(500).json({ error: error.message || 'Failed to proxy image' });
    }
  });

  app.get('/api/admin/dist-status', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    try {
      const govDoc = await db.collection('government').doc('current').get();
      const govData = govDoc.data() || {};
      const now = new Date();
      const baghdadOffset = 3 * 60 * 60 * 1000;
      const baghdadNow = new Date(now.getTime() + baghdadOffset);
      const todayBaghdad = baghdadNow.toISOString().split('T')[0];
      const baghdadTime = baghdadNow.toISOString().split('T')[1].split('.')[0]; // HH:mm:ss
      
      res.json({ 
        lastDistribution: govData.lastDistributionDate,
        forceDistribution: govData.forceDistribution,
        baghdadTime,
        shouldRun: govData.lastDistributionDate !== todayBaghdad || govData.forceDistribution === true
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/users/search', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    try {
      const q = (req.query.q as string || '').trim();
      if (!q) {
        return res.json({ users: [] });
      }

      console.log(`Searching for users with query: "${q}"`);
      const usersRef = db.collection('users_public');
      
      // Firestore prefix search is case-sensitive. 
      // We try multiple variations to be more forgiving.
      const queryStrings = new Set<string>();
      queryStrings.add(q);
      queryStrings.add(q.toLowerCase());
      queryStrings.add(q.toUpperCase());
      queryStrings.add(q.charAt(0).toUpperCase() + q.slice(1).toLowerCase());

      const snapshots = await Promise.all(
        Array.from(queryStrings).flatMap(qs => [
          usersRef
            .where('displayName', '>=', qs)
            .where('displayName', '<=', qs + '\uf8ff')
            .limit(10)
            .get(),
          usersRef
            .where('phoneNumber', '>=', qs)
            .where('phoneNumber', '<=', qs + '\uf8ff')
            .limit(10)
            .get()
        ])
      );

      const resultsMap = new Map();
      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          resultsMap.set(doc.id, {
            id: doc.id,
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL || null,
            phoneNumber: data.phoneNumber || null
          });
        });
      });

      // If no results by name or phone, try searching by ID
      if (resultsMap.size === 0 && q.length >= 20) {
        const docById = await usersRef.doc(q).get();
        if (docById.exists) {
          const data = docById.data()!;
          resultsMap.set(docById.id, {
            id: docById.id,
            displayName: data.displayName || 'Unknown',
            photoURL: data.photoURL || null,
            phoneNumber: data.phoneNumber || null
          });
        }
      }

      const results = Array.from(resultsMap.values()).slice(0, 10);
      console.log(`Found ${results.length} users for query "${q}"`);
      res.json({ users: results });
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/users/random', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.limit(50).get();

      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          displayName: data.displayName || 'Unknown',
          level: data.level || 1,
          reputation: data.reputation || 0,
          gangId: data.gangId || null,
          gangRole: data.gangRole || null,
          photoURL: data.photoURL || null
        };
      });

      res.json({ users: results });
    } catch (error) {
      console.error('Random users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/market/gift', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { senderId, recipientId, item, price, updatePath } = req.body;

    try {
      const senderRef = db.collection('users').doc(senderId);
      const recipientRef = db.collection('users').doc(recipientId);

      await db.runTransaction(async (transaction) => {
        if (senderId === recipientId) {
          throw new Error('You cannot gift to yourself');
        }
        const senderDoc = await transaction.get(senderRef);
        const senderData = senderDoc.data();

        if (!senderData || (senderData.cleanMoney || 0) < price) {
          throw new Error('Insufficient funds');
        }

        // Deduct from sender
        transaction.update(senderRef, {
          cleanMoney: admin.firestore.FieldValue.increment(-price)
        });

        // Add to recipient
        transaction.update(recipientRef, {
          [updatePath]: admin.firestore.FieldValue.increment(1)
        });

        // Send notification message
        const msgRef = db.collection('messages').doc();
        const iraqiMessages = [
          `جبتلك هاي الهدية (${item.name})، تستاهل يا بطل!`,
          `هاك هاي مني الك (${item.name})، بالعافية عليك يا غالي.`,
          `دزيتلك خوش شغلة (${item.name})، ان شاء الله تفيدك بمغامراتك.`,
          `تفضل هاي الهدية المتواضعة (${item.name})، تستاهل كل خير والله.`
        ];
        const randomMessage = iraqiMessages[Math.floor(Math.random() * iraqiMessages.length)];

        transaction.set(msgRef, {
          senderId: 'system',
          senderName: 'نظام الهدايا',
          receiverId: recipientId,
          content: randomMessage,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          type: 'system'
        });

        // Add to gift_notifications for real-time UI
        const giftNotifRef = db.collection('gift_notifications').doc();
        transaction.set(giftNotifRef, {
          recipientId,
          senderName: senderData.displayName,
          itemName: item.name,
          itemImage: item.image,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Gifting error:', error);
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/government/action', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    
    const { action, targetUserId, pmId } = req.body;

    try {
      const govDoc = await db.collection('government').doc('current').get();
      const govData = govDoc.data();

      if (govData?.primeMinisterId !== pmId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const userRef = db.collection('users').doc(targetUserId);
      
      if (action === 'issueDocs') {
        await userRef.update({
          'documents.passport': true,
          'documents.clearance': true,
          'documents.license': true,
          'documents.weapon': true
        });
      } else if (action === 'cancelWarrants') {
        await userRef.update({ warrants: false });
      } else if (action === 'releasePrisoners') {
        await userRef.update({ jailTimeEnd: null });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/government/issue-doc', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { docId, userId } = req.body;
    const prices: any = { clearance: 50000, passport: 150000, license: 25000, weapon: 500000 };
    const price = prices[docId];

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < price) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      await userRef.update({
        cleanMoney: FieldValue.increment(-price),
        [`documents.${docId}`]: true
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/government/buy-votes', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { votes, gangId, userId } = req.body;
    const votePrice = 50000;
    const totalCost = votes * votePrice;

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < totalCost) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const govRef = db.collection('government').doc('current');
      
      await db.runTransaction(async (transaction) => {
        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};
        const currentVotes = govData.gangVotes || {};
        const newVotes = (currentVotes[gangId] || 0) + votes;

        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-totalCost)
        });

        transaction.update(govRef, {
          [`gangVotes.${gangId}`]: newVotes
        });
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/government/nominate', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { userId, displayName, gangId } = req.body;
    const nominationFee = 1000000;

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < nominationFee) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const govRef = db.collection('government').doc('current');
      
      await db.runTransaction(async (transaction) => {
        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};

        if (!govData.electionActive) {
          throw new Error('Election is not active');
        }

        const candidates = govData.candidates || [];
        if (candidates.some((c: any) => c.uid === userId)) {
          throw new Error('Already a candidate');
        }

        const newCandidate = {
          uid: userId,
          displayName: displayName,
          gangId: gangId,
          votes: 0
        };

        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-nominationFee)
        });

        transaction.update(govRef, {
          candidates: FieldValue.arrayUnion(newCandidate)
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/government/bribe-committee', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { committeeId, userId } = req.body;
    const bribePrice = 10000000; // 10 Million for a committee bribe

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if ((userData?.cleanMoney || 0) < bribePrice) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const govRef = db.collection('government').doc('current');
      
      await db.runTransaction(async (transaction) => {
        const govDoc = await transaction.get(govRef);
        const govData = govDoc.data() || {};
        
        // Update committee influence or status
        const committees = govData.committees || {};
        const currentInfluence = committees[committeeId]?.influence || 0;
        
        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-bribePrice)
        });

        transaction.update(govRef, {
          [`committees.${committeeId}.influence`]: FieldValue.increment(10),
          [`committees.${committeeId}.lastBribeBy`]: userId,
          [`committees.${committeeId}.lastBribeAt`]: new Date().toISOString()
        });
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Gang Routes
  app.post('/api/gangs/create', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { name, userId, displayName } = req.body;
    const creationFee = 100000; // 100k for testing

    if (typeof name !== 'string' || name.trim().length === 0) {
      console.error('Invalid gang name:', name);
      return res.status(400).json({ error: 'Invalid gang name' });
    }

    try {
      console.log('Creating gang:', { name, userId, displayName });
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.error('User document not found:', userId);
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      console.log('User data:', userData);

      if (!userData || (userData.cleanMoney || 0) < creationFee) {
        console.error('Insufficient funds:', userData?.cleanMoney);
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      if (userData.gangId) {
        console.error('User already in a gang:', userData.gangId);
        return res.status(400).json({ error: 'Already in a gang' });
      }

      const gangId = `gang_${Date.now()}`;
      const gangRef = db.collection('gangs').doc(gangId);

      console.log('Starting transaction for gang creation...');
      try {
        await db.runTransaction(async (transaction) => {
          console.log('Transaction started...');
          transaction.update(userRef, {
            cleanMoney: FieldValue.increment(-creationFee),
            gangId: gangId,
            gangRole: 'leader'
          });

          const gangData = {
            id: gangId,
            name: name,
            leaderId: userId,
            leaderName: displayName,
            balance: 0,
            level: 1,
            reputation: 0,
            members: [userId],
            pendingRequests: [],
            inventory: [],
            description: '',
            logo: '',
            createdAt: FieldValue.serverTimestamp()
          };
          console.log('Gang data to set:', gangData);
          transaction.set(gangRef, gangData);
          console.log('Transaction operations queued...');
        });
        console.log('Transaction committed successfully.');
      } catch (transactionError: any) {
        console.error('Transaction failed:', transactionError);
        throw transactionError;
      }
      console.log('Gang created successfully:', gangId);

      res.json({ success: true, gangId });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/join-request', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, userId, displayName } = req.body;
    const joinFee = 100000; // 100k

    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();

      if (!userData || (userData.cleanMoney || 0) < joinFee) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      if (userData.gangId) {
        return res.status(400).json({ error: 'Already in a gang' });
      }

      const gangRef = db.collection('gangs').doc(gangId);
      const gangDoc = await gangRef.get();
      const gangData = gangDoc.data();

      if (!gangData) {
        return res.status(404).json({ error: 'Gang not found' });
      }

      if (gangData.pendingRequests?.some((r: any) => r.uid === userId)) {
        return res.status(400).json({ error: 'Request already pending' });
      }

      await db.runTransaction(async (transaction) => {
        transaction.update(userRef, {
          cleanMoney: FieldValue.increment(-joinFee)
        });

        transaction.update(gangRef, {
          balance: FieldValue.increment(joinFee),
          pendingRequests: FieldValue.arrayUnion({
            uid: userId,
            displayName: displayName,
            timestamp: new Date().toISOString()
          })
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/approve-request', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, applicantId, leaderId } = req.body;

    try {
      const gangRef = db.collection('gangs').doc(gangId);
      const applicantRef = db.collection('users').doc(applicantId);

      await db.runTransaction(async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!gangData || gangData.leaderId !== leaderId) {
          throw new Error('Unauthorized');
        }

        const request = gangData.pendingRequests?.find((r: any) => r.uid === applicantId);
        if (!request) {
          throw new Error('Request not found');
        }

        transaction.update(gangRef, {
          members: FieldValue.arrayUnion(applicantId),
          pendingRequests: FieldValue.arrayRemove(request)
        });

        transaction.update(applicantRef, {
          gangId: gangId,
          gangRole: 'member'
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/reject-request', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, applicantId, leaderId } = req.body;

    try {
      const gangRef = db.collection('gangs').doc(gangId);

      await db.runTransaction(async (transaction) => {
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!gangData || gangData.leaderId !== leaderId) {
          throw new Error('Unauthorized');
        }

        const request = gangData.pendingRequests?.find((r: any) => r.uid === applicantId);
        if (!request) {
          throw new Error('Request not found');
        }

        transaction.update(gangRef, {
          pendingRequests: FieldValue.arrayRemove(request)
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/deposit-item', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, userId, itemType, itemId, amount } = req.body;

    try {
      const userRef = db.collection('users').doc(userId);
      const gangRef = db.collection('gangs').doc(gangId);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data();
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!userData || !gangData || userData.gangId !== gangId) {
          throw new Error('Unauthorized');
        }

        const userInventory = userData.inventory || {};
        const category = userInventory[itemType] || {};
        const currentAmount = category[itemId] || 0;

        if (currentAmount < amount) {
          throw new Error('Insufficient items');
        }

        // Update user inventory
        transaction.update(userRef, {
          [`inventory.${itemType}.${itemId}`]: FieldValue.increment(-amount)
        });

        // Update gang inventory
        const gangInventory = gangData.inventory || {};
        const newGangAmount = (gangInventory[itemId] || 0) + amount;
        transaction.update(gangRef, {
          [`inventory.${itemId}`]: newGangAmount
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/gangs/withdraw-item', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { gangId, userId, itemId, amount } = req.body;

    try {
      const userRef = db.collection('users').doc(userId);
      const gangRef = db.collection('gangs').doc(gangId);

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data();
        const gangDoc = await transaction.get(gangRef);
        const gangData = gangDoc.data();

        if (!userData || !gangData || userData.gangId !== gangId || userData.gangRole !== 'leader') {
          throw new Error('Unauthorized');
        }

        const gangInventory = gangData.inventory || {};
        const currentGangAmount = gangInventory[itemId] || 0;

        if (currentGangAmount < amount) {
          throw new Error('Insufficient items in gang inventory');
        }

        // Determine item type (weapons, drugs, armor, tools)
        // This is a bit tricky without a global item registry, but we can infer it or pass it from client
        // For now, let's assume the client passes the itemType too for simplicity, or we try to find it.
        const itemType = req.body.itemType; // weapons, drugs, armor, tools

        // Update gang inventory
        transaction.update(gangRef, {
          [`inventory.${itemId}`]: FieldValue.increment(-amount)
        });

        // Update user inventory
        transaction.update(userRef, {
          [`inventory.${itemType}.${itemId}`]: FieldValue.increment(amount)
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  // Manual grant money endpoint removed as requested (automated now)
  /*
  app.post('/api/ministry/grant-money', async (req, res) => {
    ...
  });
  */

  app.post('/api/government/allocate-budget', async (req, res) => {
    if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
    const { pmId, roleId, amount } = req.body;

    if (!pmId || !roleId || amount === undefined) {
      return res.status(400).json({ error: 'معلومات الطلب غير مكتملة' });
    }

    try {
      const govRef = db.collection('government').doc('current');
      const pmDoc = await db.collection('users').doc(pmId).get();
      const govDoc = await govRef.get();

      if (!pmDoc.exists || !govDoc.exists) {
        return res.status(404).json({ error: 'البيانات غير موجودة' });
      }

      const govData = govDoc.data()!;
      if (govData.primeMinisterId !== pmId) {
        return res.status(403).json({ error: 'غير مصرح لك: أنت لست رئيس الوزراء' });
      }

      await govRef.update({
        [`budgets.${roleId}`]: amount
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Internal server error' });
    }
  });

  // AI Worker Loop (every 5 minutes to save quota)
  setInterval(async () => {
    if (!db) return;
    
    console.log('AI Worker running...');
    
    try {
      const govRef = db.collection('government').doc('current');
      const govDoc = await govRef.get();
      const govData = govDoc.data();
      
      if (govData) {
        const now = Date.now();
        
        // --- Automated Budget Distribution (Daily) ---
        const baghdadOffset = 3 * 60 * 60 * 1000;
        const baghdadNow = new Date(now + baghdadOffset);
        const todayBaghdad = baghdadNow.toISOString().split('T')[0];
        
        const shouldRunDistribution = govData.lastDistributionDate !== todayBaghdad || govData.forceDistribution === true;

        if (shouldRunDistribution) {
          console.log('Starting budget distribution (Baghdad Time: ' + baghdadNow.toISOString() + ')...');
          
          const ministerialRoles = [
            'interior', 'defense', 'foreign', 'finance', 'health', 
            'industry', 'oil', 'electricity', 'labor', 'intelligence', 'security'
          ];

          const humorMessages = [
            "الوزارة تگولك هاي مليون مكرمة، اصرفها بالعافية ولا تسأل منين جتي!",
            "هاي مليون من ميزانية الوزارة، حصتك من النفط وصلت، لتگول الحكومة مقصرة!",
            "السيد الوزير يگولك هاي مليون هدية، اشتري بيها صمون حار وادعيلنا بالانتخابات.",
            "الوزارة دزتلك مليون، هاي حصتك من الميزانية، اصرفها وسكت لا تطلع مظاهرات!",
            "استلم مليون من الوزارة، هاي هدية بمناسبة 'الصمود والتصدي'، دير بالك تسأل عن المصدر!",
            "الوزير يگولك هاي مليون، حصتك من خيرات البلد، لتگول ماكو تعيينات!",
            "هاي مليون من الوزارة، مكرمة سياسية فكاهية، اصرفها وانسى الوعود الانتخابية!",
            "الوزارة تگولك هاي مليون، حصتك من الواردات، لتگول الحكومة بس تاخذ ما تنطي!"
          ];

          // Get eligible players (cleanMoney < 10,000,000)
          // Limit to 100 users to avoid massive read
          const allUsersSnapshot = await db.collection('users').orderBy('cleanMoney').limit(100).get();
          
          let eligibleUsers = allUsersSnapshot.docs
            .map((doc: any) => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => (u.cleanMoney || 0) < 10000000);

          if (eligibleUsers.length > 0) {
            const batch = db.batch();
            for (const role of ministerialRoles) {
              const cabinet = govData.cabinet || {};
              const minister = cabinet[role];

              // Pick 3 random users from eligible list per role (reduced from 10 to save quota)
              const shuffled = [...eligibleUsers].sort(() => 0.5 - Math.random());
              const selected = shuffled.slice(0, 3);

              for (const user of selected) {
                const randomMsg = humorMessages[Math.floor(Math.random() * humorMessages.length)];
                
                // Update user money
                const userRef = db.collection('users').doc(user.id);
                batch.update(userRef, {
                  cleanMoney: admin.firestore.FieldValue.increment(1000000)
                });

                // Send message
                const msgRef = db.collection('messages').doc();
                batch.set(msgRef, {
                  senderId: 'system',
                  senderName: 'الوزارة',
                  receiverId: user.id,
                  content: randomMsg,
                  timestamp: admin.firestore.FieldValue.serverTimestamp(),
                  read: false,
                  type: 'system'
                });
              }
            }
            await batch.commit();
          }
          
          await govRef.update({ lastDistributionDate: todayBaghdad, forceDistribution: false });
        }

        // --- Hourly Tasks ---
        const lastHourlyTask = govData.lastHourlyTask || 0;
        if (now - lastHourlyTask > 3600000) {
          console.log('Running hourly tasks...');
          
          // 1. Message Cleanup (Delete messages older than 12 hours)
          const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);
          const oldMessages = await db.collection('messages')
            .where('timestamp', '<', twelveHoursAgo)
            .limit(100) // Delete in small chunks to save quota
            .get();
          
          if (!oldMessages.empty) {
            const batch = db.batch();
            oldMessages.docs.forEach((doc: any) => batch.delete(doc.ref));
            await batch.commit();
            console.log(`Deleted ${oldMessages.size} old messages.`);
          }

          // 2. PM Corruption Income (Truly Hourly)
          const pmGangId = govData.primeMinisterGangId;
          if (pmGangId) {
            const gangMembers = await db.collection('users').where('gangId', '==', pmGangId).get();
            const batch = db.batch();
            for (const memberDoc of gangMembers.docs) {
              batch.update(memberDoc.ref, {
                'cleanMoney': admin.firestore.FieldValue.increment(500000)
              });
            }
            await batch.commit();
            console.log(`Distributed corruption income to ${gangMembers.size} gang members.`);
          }

          // 3. Seat Distribution Logic (based on votes)
          const gangVotes = govData.gangVotes || {};
          const totalVotes = Object.values(gangVotes).reduce((a: any, b: any) => a + b, 0) as number;
          
          if (totalVotes > 0) {
            const newSeats: any = {};
            Object.entries(gangVotes).forEach(([gangId, votes]: [string, any]) => {
              newSeats[gangId] = Math.floor((votes / totalVotes) * 150);
            });
            await govRef.update({ gangSeats: newSeats });
          }

          await govRef.update({ lastHourlyTask: now });
        }

        // --- Election Logic (Check every 5 mins is fine) ---
        const electionDate = govData.electionTimestamp ? new Date(govData.electionTimestamp) : null;
        const electionEndTime = govData.electionEndTime ? new Date(govData.electionEndTime) : null;
        
        if (govData.electionActive && electionEndTime && new Date() > electionEndTime) {
          console.log('Finalizing election from server...');
          try {
            await db.runTransaction(async (transaction) => {
              const freshGovDoc = await transaction.get(govRef);
              if (!freshGovDoc.exists) return;
              const freshData = freshGovDoc.data();
              if (!freshData || !freshData.electionActive) return;

              const candidates = freshData.candidates || [];
              const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes);

              const results: any = {
                speakerId: sortedCandidates[0]?.uid || null,
                deputy1Id: sortedCandidates[1]?.uid || null,
                deputy2Id: sortedCandidates[2]?.uid || null
              };

              const MAX_SEATS = 329;
              const gangSeats: Record<string, number> = {};
              const gangVotes = freshData.gangVotes || {};
              
              const candidatesWithSeats = sortedCandidates.filter(c => c.votes > 0).slice(0, MAX_SEATS);
              candidatesWithSeats.forEach(c => {
                c.seats = 1;
                c.position = 'Member';
                if (c.uid === results.speakerId) c.position = 'Speaker';
                else if (c.uid === results.deputy1Id) c.position = 'Deputy1';
                else if (c.uid === results.deputy2Id) c.position = 'Deputy2';

                if (c.gangId) {
                  gangSeats[c.gangId] = (gangSeats[c.gangId] || 0) + 1;
                }
              });

              transaction.update(govRef, {
                electionActive: false,
                lastElectionResults: results,
                electedMPs: candidatesWithSeats,
                gangSeats: gangSeats,
                electionTimestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            });
            console.log('Election finalized successfully.');
          } catch (e) {
            console.error('Failed to finalize election:', e);
          }
        } else if (electionDate && new Date() > electionDate) {
          console.log('Resetting election timestamp...');
          await govRef.update({
            electionTimestamp: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(),
            electionActive: false
          });
        }

        // --- Protection Upkeep (Daily) ---
        const lastUpkeepDate = govData.lastUpkeepDate || '';
        if (lastUpkeepDate !== todayBaghdad) {
          console.log('Running daily protection upkeep for all users...');
          const usersWithProtection = await db.collection('users')
            .where('protection.guards', '!=', [])
            .limit(50) // Process in small batches to save quota
            .get();
          
          if (!usersWithProtection.empty) {
            const batch = db.batch();
            for (const userDoc of usersWithProtection.docs) {
              const userData = userDoc.data();
              const guards = userData.protection?.guards || [];
              const cars = userData.protection?.cars || [];
              
              const foodCost = guards.length * 1000;
              const fuelCost = cars.length * 1000;
              const salaries = guards.reduce((acc: number, g: any) => acc + (g.isPlayer ? 50000 : 10000), 0);
              const totalCost = foodCost + fuelCost + salaries;

              if ((userData.cleanMoney || 0) >= totalCost) {
                batch.update(userDoc.ref, {
                  cleanMoney: admin.firestore.FieldValue.increment(-totalCost),
                  'protection.lastUpkeepPaid': now
                });
              } else {
                // If they can't pay, maybe some guards leave? (Optional logic)
                console.log(`User ${userDoc.id} could not pay protection upkeep.`);
              }
            }
            await batch.commit();
          }
          await govRef.update({ lastUpkeepDate: todayBaghdad });
        }
      }
    } catch (error) {
      console.error('Error in AI Worker:', error);
    }
  }, 300000); // Run every 5 minutes

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Server Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    app.use(express.static(path.join(process.cwd(), 'public')));
    const server = http.createServer(app);
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist'))
      ? path.join(process.cwd(), 'dist')
      : path.join(process.cwd(), 'build');
    app.use(express.static(distPath));
    
    // Ensure API routes return JSON 404, not index.html
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: 'Not Found', message: `API route ${req.originalUrl} not found` });
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });
  }
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
