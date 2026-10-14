import fs from 'fs';
import https from 'https';
import path from 'path';

const urls = {
  elizabeth: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTIxOWY1ODcwODE5MWE3MDFhNzNjNTFmZjc3OTQ6ZmlsZV8wMDAwMDAwMGQ5OTA3MjQzYjVmMWZjNGMxMjIyNjJlYiIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6ImZkNGMzODhhZDc5N2YwZmVhZGUwMGExY2FhM2FkMjAyYzEyOWM4YjFlNWU4ZDQ4M2FiYjRiZWQxNmU2YWRhYzUiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
  jawaher: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTJmODIyNGQ4ODE5MThmNDU2ZmQyNzQxZDFlZjE6ZmlsZV8wMDAwMDAwMDM0YTg3MWY3YTVhN2M5MWExNzczN2E2MCIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6Ijc4MWU4NmI4M2QyZmE2NmI2MDA5ZDVkM2U1YjBlNTE5MGExYmE5NzM4YjI5NzZmMDRlYTk2NzZjMGJmODA2OGEiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
  natalia: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTJkZTUxYzI4ODE5MWEwMTkzMDI5ZTlkOWM4YWY6ZmlsZV8wMDAwMDAwMGZiZjA3MWZkODA2OWMyNDVmOWE3ZDI3ZiIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjgzYjE1YmU1ZWVjZWQyNTU4OGEyMzgwYzg1Njc4MjNmZTZlMmQzNDE4YTdhMmRkMGEwOTY0MTEyOTMzYmVmZDAiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
  jackson: 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMTBmNzk1MTc0ODE5MWFlOTQ5MDczNmE3MjgzNzE6ZmlsZV8wMDAwMDAwMDZkZTQ3MWY0YTQ5MjUzMjRhMWMxMGVkYSIsInRzIjoiMjA1NDciLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6Ijc5MjBkNjdkODNiNzU4MDZjYTA5MTE4MjdhZDIxMTZiNmM0Mzg1ZjEyYTJhZDdmMjA5NTY2NWExN2ExOTkzMTYiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9',
  wealthy_bg: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
};

const dir = path.join(process.cwd(), 'public', 'images', 'wealthy');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

Object.entries(urls).forEach(([name, url]) => {
  const filePath = path.join(dir, `${name}.png`);
  const file = fs.createWriteStream(filePath);
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${name}.png`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {});
    console.error(`Error downloading ${name}: ${err.message}`);
  });
});
