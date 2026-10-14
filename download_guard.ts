import fs from 'fs';
import path from 'path';
import https from 'https';

const url = "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjlkMDExYzI4Y2U4ODE5MTg0MmIwYWVkNGE5YzhiMjk6ZmlsZV8wMDAwMDAwMGU4MWM3MjQ2ODgwMWVmODY2NmI1ZDMzNCIsInRzIjoiMjA1NTMiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6IjViNzUyMjUzYzllYWJhOGY3MDdkNjZhZjRjMDI4ODFmNDAzNzdlOGM4OTFiYzVhZjE3NGY2MDg0NjU5NTZlZmQiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9";
const dir = path.join(process.cwd(), 'public', 'images', 'guards');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
const file = fs.createWriteStream(path.join(dir, 'default.png'));

https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed.');
  });
}).on('error', (err) => {
  fs.unlink(path.join(dir, 'default.png'), () => {});
  console.error('Error downloading:', err.message);
});
