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
  
  // Asosiy rasmdan qirqib olish
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

  const knobSize = Math.min(width, height) * 0.25;

  let directions;
  do {
    directions = {
      top: Math.random() < 0.5 ? 1 : -1,
      right: Math.random() < 0.5 ? 1 : -1,
      bottom: Math.random() < 0.5 ? 1 : -1,
      left: Math.random() < 0.5 ? 1 : -1
    };

    const inwardCount = Object.values(directions).filter(d => d === -1).length;
    
    if (inwardCount === 0) {
      const sides = ['top', 'right', 'bottom', 'left'];
      const randomSide = sides[Math.floor(Math.random() * sides.length)];
      directions[randomSide] = -1;
    }

  } while (
    Object.values(directions).filter(d => d === -1).length > 2 ||
    (directions.top === -1 && directions.bottom === -1) ||
    (directions.left === -1 && directions.right === -1) ||
    Object.values(directions).filter(d => d === -1).length === 0
  );

  // Puzzle shaklini chizish funksiyasi
  const drawPuzzleShape = (context, baseX, baseY, width, height, directions, knobSize) => {
    context.beginPath();
    
    // Yuqori qism
    context.moveTo(baseX, baseY);
    context.lineTo(baseX + width * 0.35, baseY);
    context.bezierCurveTo(
      baseX + width * 0.45, baseY - knobSize * directions.top * 0.8,
      baseX + width * 0.55, baseY - knobSize * directions.top * 0.8,
      baseX + width * 0.65, baseY
    );
    context.lineTo(baseX + width, baseY);

    // O'ng tomon
    context.lineTo(baseX + width, baseY + height * 0.35);
    context.bezierCurveTo(
      baseX + width + knobSize * directions.right * 0.8, baseY + height * 0.45,
      baseX + width + knobSize * directions.right * 0.8, baseY + height * 0.55,
      baseX + width, baseY + height * 0.65
    );
    context.lineTo(baseX + width, baseY + height);

    // Pastki qism
    context.lineTo(baseX + width * 0.65, baseY + height);
    context.bezierCurveTo(
      baseX + width * 0.55, baseY + height + knobSize * directions.bottom * 0.8,
      baseX + width * 0.45, baseY + height + knobSize * directions.bottom * 0.8,
      baseX + width * 0.35, baseY + height
    );
    context.lineTo(baseX, baseY + height);

    // Chap tomon
    context.lineTo(baseX, baseY + height * 0.65);
    context.bezierCurveTo(
      baseX - knobSize * directions.left * 0.8, baseY + height * 0.55,
      baseX - knobSize * directions.left * 0.8, baseY + height * 0.45,
      baseX, baseY + height * 0.35
    );
    context.closePath();
  };

  // 1. Frontend uchun puzzle bo'lakcha
  drawPuzzleShape(pieceCtx, extraSpace, extraSpace, width, height, directions, knobSize);
  pieceCtx.clip();
  pieceCtx.drawImage(squareCanvas, 0, 0);

  // 2. Asosiy rasmda teshik qoldirish
  ctx.save();
  ctx.translate(x, y);
  
  // Teshik uchun path
  drawPuzzleShape(ctx, 0, 0, width, height, directions, knobSize);
  
  // Teshikni oqlash
  ctx.fillStyle = "white";
  ctx.fill();
  
  // Teshik atrofiga border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // 3. Boshqa joydan olingan puzzle bo'lakcha
  // Koordinatalar (rasmning boshqa qismidan)
  const fillX = Math.max(0, Math.min(200, x + 100));
  const fillY = Math.max(0, Math.min(100, y + 50));
  
  // Boshqa joydan olingan puzzle bo'lakchani yaratish 
  // Kattaroq canvas yaratish shoxlar ko'rinishi uchun
  const backPieceCanvas = createCanvas(pieceWidth + extraSpace * 4, pieceHeight + extraSpace * 4);
  const backPieceCtx = backPieceCanvas.getContext("2d");
  
  // Boshqa joydan rasm qirqib olish - kattaroq area
  backPieceCtx.drawImage(
    image, 
    fillX - extraSpace * 2,
    fillY - extraSpace * 2,
    pieceWidth + extraSpace * 4,
    pieceHeight + extraSpace * 4,
    0,
    0,
    pieceWidth + extraSpace * 4,
    pieceHeight + extraSpace * 4
  );
  
  // Puzzle shakli chizish - markazda
  drawPuzzleShape(backPieceCtx, extraSpace * 2, extraSpace * 2, width, height, directions, knobSize);
  
  // Shakl chizish va chiqib turadiganlarini ham qo'shib olish
  backPieceCtx.save();
  backPieceCtx.clip();
  backPieceCtx.drawImage(
    image, 
    fillX - extraSpace * 2,
    fillY - extraSpace * 2,
    pieceWidth + extraSpace * 4,
    pieceHeight + extraSpace * 4,
    0,
    0,
    pieceWidth + extraSpace * 4,
    pieceHeight + extraSpace * 4
  );
  
  // Border qo'shish (xuddi frontga ketayotgan puzzle kabi)
  backPieceCtx.restore();
  backPieceCtx.strokeStyle = "#000000";
  backPieceCtx.lineWidth = 1;
  backPieceCtx.stroke();
  
  // Teshikka joylash - o'lchamini to'g'ri berish uchun kerakli qismi chiqib turadigan shoxlarni ham olish
  // Shoxlar bilan birga puzzle o'lchamini hisoblash
  const maxKnobExtent = knobSize * 0.8; // Shoxlarning maksimal chiqib turish darajasi
  
  // Puzzle shakli tashqarisini transparent qilish
  backPieceCtx.globalCompositeOperation = 'destination-in';
  drawPuzzleShape(backPieceCtx, extraSpace * 2, extraSpace * 2, width, height, directions, knobSize);
  backPieceCtx.fill();
  backPieceCtx.globalCompositeOperation = 'source-over';
  
  // Border chizish
  backPieceCtx.strokeStyle = "#000000";
  backPieceCtx.lineWidth = 1;
  backPieceCtx.stroke();
  
  ctx.drawImage(
    backPieceCanvas,
    extraSpace * 2 - maxKnobExtent, // Chap tomondagi shox uchun joy
    extraSpace * 2 - maxKnobExtent, // Yuqori tomondagi shox uchun joy
    width + maxKnobExtent * 2,  // Yon tomonlar uchun qo'shimcha
    height + maxKnobExtent * 2, // Yuqori/past tomonlar uchun qo'shimcha
    -maxKnobExtent, // Chap shoxni ko'rsatish
    -maxKnobExtent, // Yuqori shoxni ko'rsatish
    width + maxKnobExtent * 2,  // To'liq kenglik
    height + maxKnobExtent * 2  // To'liq balandlik
  );
  
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
