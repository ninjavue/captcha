const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { createCanvas, loadImage } = require("canvas");
const helmet = require("helmet");

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(helmet());
app.use(
  cors({
    origin: "*",
    methods: "GET, POST",
    credentials: true,
  })
);

const captchaStore = new Map();

const createJigsawPiece = async (image, x, y, width, height) => {
  // Asosiy canvas
  const canvas = createCanvas(300, 200);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, 300, 200);

  // Kattaroq to'rtburchak qirqib olish uchun canvas
  const extraSpace = 9;
  const pieceWidth = width;  // Asosiy o'lcham
  const pieceHeight = height;
  
  const squareCanvas = createCanvas(pieceWidth + extraSpace * 2, pieceHeight + extraSpace * 2);
  const squareCtx = squareCanvas.getContext("2d");

  // Kattaroq qismni rasmdan qirqib olish
  squareCtx.drawImage(
    image, 
    x - extraSpace,
    y - extraSpace,
    pieceWidth + extraSpace * 2,
    pieceHeight + extraSpace * 2,
    0,
    0,
    pieceWidth + extraSpace * 2,
    pieceHeight + extraSpace * 2
  );

  // Jigsaw shakli uchun canvas
  const pieceCanvas = createCanvas(pieceWidth + extraSpace * 2, pieceHeight + extraSpace * 2);
  const pieceCtx = pieceCanvas.getContext("2d");

  // Jigsaw shakli parametrlari
  const knobSize = Math.min(width, height) * 0.3;

  // Jigsaw shaklini chizish
  pieceCtx.beginPath();
  
  // Asosiy to'rtburchak
  const baseX = extraSpace;
  const baseY = extraSpace;
  
  // Yuqori qism
  pieceCtx.moveTo(baseX, baseY);
  pieceCtx.lineTo(baseX + width * 0.3, baseY);
  pieceCtx.bezierCurveTo(
    baseX + width * 0.4, baseY - knobSize,
    baseX + width * 0.6, baseY - knobSize,
    baseX + width * 0.7, baseY
  );
  pieceCtx.lineTo(baseX + width, baseY);

  // O'ng tomon
  pieceCtx.lineTo(baseX + width, baseY + height * 0.3);
  pieceCtx.bezierCurveTo(
    baseX + width + knobSize, baseY + height * 0.4,
    baseX + width + knobSize, baseY + height * 0.6,
    baseX + width, baseY + height * 0.7
  );
  pieceCtx.lineTo(baseX + width, baseY + height);

  // Pastki qism
  pieceCtx.lineTo(baseX + width * 0.7, baseY + height);
  pieceCtx.bezierCurveTo(
    baseX + width * 0.6, baseY + height + knobSize,
    baseX + width * 0.4, baseY + height + knobSize,
    baseX + width * 0.3, baseY + height
  );
  pieceCtx.lineTo(baseX, baseY + height);

  // Chap tomon
  pieceCtx.lineTo(baseX, baseY + height * 0.7);
  pieceCtx.bezierCurveTo(
    baseX - knobSize, baseY + height * 0.6,
    baseX - knobSize, baseY + height * 0.4,
    baseX, baseY + height * 0.3
  );
  pieceCtx.closePath();

  // Jigsaw shaklini kesib olish va rasmni chizish
  pieceCtx.clip();
  pieceCtx.drawImage(squareCanvas, 0, 0);

  // Asosiy rasmda teshik qoldirish
  ctx.save();
  // Teshik markazini to'g'rilash
  ctx.translate(x, y);
  ctx.beginPath();
  
  // Teshik uchun jigsaw shakli
  // Yuqori qism
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.3, 0);
  ctx.bezierCurveTo(
    width * 0.4, -knobSize,
    width * 0.6, -knobSize,
    width * 0.7, 0
  );
  ctx.lineTo(width, 0);

  // O'ng tomon
  ctx.lineTo(width, height * 0.3);
  ctx.bezierCurveTo(
    width + knobSize, height * 0.4,
    width + knobSize, height * 0.6,
    width, height * 0.7
  );
  ctx.lineTo(width, height);

  // Pastki qism
  ctx.lineTo(width * 0.7, height);
  ctx.bezierCurveTo(
    width * 0.6, height + knobSize,
    width * 0.4, height + knobSize,
    width * 0.3, height
  );
  ctx.lineTo(0, height);

  // Chap tomon
  ctx.lineTo(0, height * 0.7);
  ctx.bezierCurveTo(
    -knobSize, height * 0.6,
    -knobSize, height * 0.4,
    0, height * 0.3
  );
  ctx.closePath();

  // Teshikni oq rang bilan to'ldirish
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fill();
  ctx.restore();

  return {
    piece: pieceCanvas,
    imageWithHole: canvas,
    jigsawX: x,  // Original koordinatalar
    jigsawY: y
  };
};

app.get("/generate-captcha", async (req, res) => {
  try {
    const imageUrl = `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`;
    const image = await loadImage(imageUrl);

    const puzzleWidth = 40;
    const puzzleHeight = 40;
    const extraSpace = 20;
    
    // Chegaralarni hisobga olish
    const maxX = 300 - puzzleWidth - extraSpace * 2;
    const maxY = 200 - puzzleHeight - extraSpace * 2;
    
    // Koordinatalarni aniqroq hisoblash
    const x = Math.max(extraSpace, Math.min(maxX, Math.floor(Math.random() * maxX)));
    const y = Math.max(extraSpace, Math.min(maxY, Math.floor(Math.random() * maxY)));

    const { piece, imageWithHole, jigsawX, jigsawY } = await createJigsawPiece(
      image,
      x,
      y,
      puzzleWidth, 
      puzzleHeight
    );

    const captchaId = crypto.randomBytes(8).toString("hex");
    
    // Koordinatalarni saqlash
    captchaStore.set(captchaId, {
      x: jigsawX,
      y: jigsawY,
      expires: Date.now() + 30 * 1000
    });

    res.json({
      captchaId,
      mainImage: imageWithHole.toDataURL(),
      puzzlePiece: piece.toDataURL()
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Error loading image" });
  }
});

app.post("/verify-captcha", (req, res) => {
  const { captchaId, x, y } = req.body;
  console.log("Received coordinates:", { x, y });
  
  const storedCaptcha = captchaStore.get(captchaId);
  console.log("Stored captcha:", storedCaptcha);

  if (!storedCaptcha || storedCaptcha.expires < Date.now()) {
    captchaStore.delete(captchaId);
    return res.status(403).json({ error: "CAPTCHA not found or expired." });
  }

  // Koordinatalarni butun songa o'tkazish
  const receivedX = Math.round(Number(x));
  const receivedY = Math.round(Number(y));
  const storedX = Math.round(Number(storedCaptcha.x));
  const storedY = Math.round(Number(storedCaptcha.y));

  // Farqni hisoblash
  const xDiff = Math.abs(storedX - receivedX);
  const yDiff = Math.abs(storedY - receivedY);

  console.log("Differences:", { xDiff, yDiff });

  // Tekshirish chegaralari
  const tolerance = 10;

  // Koordinatalar to'g'ri kelishini tekshirish
  const isCorrect = xDiff <= tolerance && yDiff <= tolerance;

  captchaStore.delete(captchaId);

  if (isCorrect) {
    res.json({ 
      success: true, 
      message: "CAPTCHA successfully verified."
    });
  } else {
    res.status(403).json({ 
      success: false, 
      message: "The puzzle is misplaced.",
      debug: {
        received: { x: receivedX, y: receivedY },
        expected: { x: storedX, y: storedY },
        difference: { x: xDiff, y: yDiff },
        tolerance
      }
    });
  }
});

app.get("/get-target-position/:captchaId", (req, res) => {
  const captcha = captchaStore.get(req.params.captchaId);
  if (!captcha) {
    return res.status(404).json({ error: "Captcha not found" });
  }
  res.json({
    x: captcha.x,
    y: captcha.y
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
