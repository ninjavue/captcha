const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const rows = 3; // Puzzle bo'laklari qatori
const cols = 3; // Puzzle bo'laklari ustuni

function drawPuzzle(imageSrc) {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
        const pieceWidth = img.width / cols;
        const pieceHeight = img.height / rows;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * pieceWidth;
                const y = row * pieceHeight;
                drawPiece(x, y, pieceWidth, pieceHeight);
            }
        }
    };
}

function drawPiece(x, y, width, height) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Rasm yuklab ishlatish
const imageUrl = "./photo.jpg"; // Rasm URL sini shu yerda almashtiring
drawPuzzle(imageUrl);
