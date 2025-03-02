import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Loader from "./components/Loader";

const App = () => {
  const [captcha, setCaptcha] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [response, setResponse] = useState(null);
  const [timer, setTimer] = useState(300);
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });
  const puzzleRef = useRef(null);
  const containerRef = useRef(null);
  const startPosition = useRef({ x: 0, y: 0 });

  const fetchCaptcha = async () => {
    try {
      const res = await axios.get("http://localhost:5000/generate-captcha");
      setCaptcha(res.data);
      setPosition({ x: 20, y: 230 });
      setTimer(30);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    document.title = "Puzzle Captcha";
    fetchCaptcha();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      fetchCaptcha();
    }
  }, [timer]);

  const handleMouseDown = (e) => {
    setDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!dragging || !containerRef.current || !captcha) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.pageX - containerRect.left;
    const y = e.pageY - containerRect.top;

    const newX = Math.max(0, Math.min(x, containerRect.width - 40));
    const newY = Math.max(0, Math.min(y, containerRect.height - 40));

    const magneticThreshold = 5;
    const xDiff = Math.abs((targetPosition.x - 7) - newX);
    const yDiff = Math.abs((targetPosition.y - 7) - newY);

    let finalX, finalY;

    if (xDiff <= magneticThreshold && yDiff <= magneticThreshold) {
      const snapX = (targetPosition.x - 9) + (newX - (targetPosition.x - 9)) * 0.1;
      const snapY = (targetPosition.y - 9) + (newY - (targetPosition.y - 9)) * 0.1;
      
      finalX = Math.abs(snapX - (targetPosition.x - 9)) < 5 ? (targetPosition.x - 9) : snapX;
      finalY = Math.abs(snapY - (targetPosition.y - 9)) < 5 ? (targetPosition.y - 9) : snapY;
    } else {
      finalX = newX;
      finalY = newY;
    }

    setPosition({ x: finalX, y: finalY });
  };

  const handleMouseUp = async () => {
    if (!dragging) return;
    
    setDragging(false);

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = position.x;
    const y = position.y;

    const isOverMainImage = x >= 0 && x <= containerRect.width - 40 && 
                          y >= 0 && y <= containerRect.height - 40;

    if (!isOverMainImage) {
      setResponse({
        status: 403,
        message: "Puzzle bo'lakcha rasm ustida emas!",
      });
      return;
    }
    
    try {
      const res = await axios.post("http://localhost:5000/verify-captcha", {
        captchaId: captcha.captchaId,
        x: position.x,
        y: position.y,
      });

      if (res.status === 200 && res.data.success) {
        setResponse({
          status: 200,
          message: "Captcha muvaffaqiyatli tasdiqlandi.",
        });
      } else {
        setResponse({
          status: 403,
          message: "Captcha noto'g'ri joylashtirildi!",
        });
      }
      setTimeout(() => {
        fetchCaptcha();
      }, 1000);
    } catch (error) {
      if (error.response && error.response.status === 403) {
        setResponse({
          status: 403,
          message: "Captcha noto'g'ri joylashtirildi!",
        });
        setTimeout(() => {
          fetchCaptcha();
        }, 1000);
      } else {
        console.error("Internal server error", error);
        alert("Server bilan bog'lanishda xatolik!");
      }
    }
  };

  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  useEffect(() => {
    const fetchTargetPosition = async () => {
      if (captcha) {
        try {
          const res = await axios.get(`http://localhost:5000/get-target-position/${captcha.captchaId}`);
          setTargetPosition({ x: res.data.x, y: res.data.y });
        } catch (error) {
          console.error("Target pozitsiyani olishda xatolik:", error);
        }
      }
    };
    
    fetchTargetPosition();
  }, [captcha]);

  if (!captcha)
    return (
      <div className="d-center">
        <Loader />
      </div>
    );

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <div className="result-box">
        {response && (
          <p className={`${response?.status !== 403 ? "bg-success" : "bg-danger"}`}>
            {response.message}
          </p>
        )}
      </div>
      <p>Captchani amal qilish vaqti: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>
      <div
        ref={containerRef}
        className="puzzle-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
        style={{ 
          cursor: dragging ? "move" : "default", 
          position: "relative",
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none"
        }}
      >
        <img
          src={captcha.mainImage}
          alt="Main CAPTCHA"
          className="full-img"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            pointerEvents: "none"
          }}
        />
        <div 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "absolute",
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isHovering || dragging ? "move" : "default",
            zIndex: 10,
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none"
          }}
        >
          <img
            ref={puzzleRef}
            src={captcha.puzzlePiece}
            alt="Puzzle Piece"
            className="puzzle-img"
            style={{
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              userSelect: "none",
              WebkitUserSelect: "none"
            }}
          />
        </div>
      </div>
      <button onClick={fetchCaptcha} className="btn">
        Captchani yangilash
      </button>
    </div>
  );
};

export default App;
