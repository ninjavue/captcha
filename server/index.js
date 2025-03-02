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
  const canvas = createCanvas(300, 200);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, 300, 200);

  const extraSpace = 9;
  const pieceWidth = width;
  const pieceHeight = height;
  
  const squareCanvas = createCanvas(pieceWidth + extraSpace * 2, pieceHeight + extraSpace * 2);
  const squareCtx = squareCanvas.getContext("2d");

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

  const pieceCanvas = createCanvas(pieceWidth + extraSpace * 2, pieceHeight + extraSpace * 2);
  const pieceCtx = pieceCanvas.getContext("2d");

  const knobSize = Math.min(width, height) * 0.3;

  // Shoxlar yo'nalishini generatsiya qilish
  let directions;
  do {
    directions = {
      top: Math.random() < 0.5 ? 1 : -1,
      right: Math.random() < 0.5 ? 1 : -1,
      bottom: Math.random() < 0.5 ? 1 : -1,
      left: Math.random() < 0.5 ? 1 : -1
    };

    // Ichkariga kirgan shoxlar soni
    const inwardCount = Object.values(directions).filter(d => d === -1).length;
    
    // Agar hech qaysi shox ichkariga kirmagan bo'lsa
    if (inwardCount === 0) {
      // Tasodifiy bitta shoxni ichkariga o'zgartirish
      const sides = ['top', 'right', 'bottom', 'left'];
      const randomSide = sides[Math.floor(Math.random() * sides.length)];
      directions[randomSide] = -1;
    }

  } while (
    // Ichkariga kirgan shoxlar 2 tadan ko'p bo'lmasin
    Object.values(directions).filter(d => d === -1).length > 2 ||
    // Qarama-qarshi tomonlar bir vaqtda ichkarida bo'lmasin
    (directions.top === -1 && directions.bottom === -1) ||
    (directions.left === -1 && directions.right === -1) ||
    // Kamida bitta shox ichkarida bo'lsin
    Object.values(directions).filter(d => d === -1).length === 0
  );

  pieceCtx.beginPath();
  const baseX = extraSpace;
  const baseY = extraSpace;
  
  // Yuqori qism
  pieceCtx.moveTo(baseX, baseY);
  pieceCtx.lineTo(baseX + width * 0.3, baseY);
  pieceCtx.bezierCurveTo(
    baseX + width * 0.4, baseY - knobSize * directions.top,
    baseX + width * 0.6, baseY - knobSize * directions.top,
    baseX + width * 0.7, baseY
  );
  pieceCtx.lineTo(baseX + width, baseY);

  // O'ng tomon
  pieceCtx.lineTo(baseX + width, baseY + height * 0.3);
  pieceCtx.bezierCurveTo(
    baseX + width + knobSize * directions.right, baseY + height * 0.4,
    baseX + width + knobSize * directions.right, baseY + height * 0.6,
    baseX + width, baseY + height * 0.7
  );
  pieceCtx.lineTo(baseX + width, baseY + height);

  // Pastki qism
  pieceCtx.lineTo(baseX + width * 0.7, baseY + height);
  pieceCtx.bezierCurveTo(
    baseX + width * 0.6, baseY + height + knobSize * directions.bottom,
    baseX + width * 0.4, baseY + height + knobSize * directions.bottom,
    baseX + width * 0.3, baseY + height
  );
  pieceCtx.lineTo(baseX, baseY + height);

  // Chap tomon
  pieceCtx.lineTo(baseX, baseY + height * 0.7);
  pieceCtx.bezierCurveTo(
    baseX - knobSize * directions.left, baseY + height * 0.6,
    baseX - knobSize * directions.left, baseY + height * 0.4,
    baseX, baseY + height * 0.3
  );
  pieceCtx.closePath();

  pieceCtx.clip();
  pieceCtx.drawImage(squareCanvas, 0, 0);

  // Asosiy rasmda teshik qoldirish
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  
  // Teshik uchun jigsaw shakli
  // Yuqori qism
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.3, 0);
  ctx.bezierCurveTo(
    width * 0.4, -knobSize * directions.top,
    width * 0.6, -knobSize * directions.top,
    width * 0.7, 0
  );
  ctx.lineTo(width, 0);

  // O'ng tomon
  ctx.lineTo(width, height * 0.3);
  ctx.bezierCurveTo(
    width + knobSize * directions.right, height * 0.4,
    width + knobSize * directions.right, height * 0.6,
    width, height * 0.7
  );
  ctx.lineTo(width, height);

  // Pastki qism
  ctx.lineTo(width * 0.7, height);
  ctx.bezierCurveTo(
    width * 0.6, height + knobSize * directions.bottom,
    width * 0.4, height + knobSize * directions.bottom,
    width * 0.3, height
  );
  ctx.lineTo(0, height);

  // Chap tomon
  ctx.lineTo(0, height * 0.7);
  ctx.bezierCurveTo(
    -knobSize * directions.left, height * 0.6,
    -knobSize * directions.left, height * 0.4,
    0, height * 0.3
  );
  ctx.closePath();

  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fill();
  ctx.restore();

  return {
    piece: pieceCanvas,
    imageWithHole: canvas,
    jigsawX: x,
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
