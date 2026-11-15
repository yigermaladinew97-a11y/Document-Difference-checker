import React, { useEffect, useState } from 'react';

export default function CountUp({ end, duration = 1200, prefix = '', suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const target = Number(end) || 0;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = easeOutQuart(progress);
      
      const currentVal = easedProgress * target;
      setCount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  const formatted = decimals > 0 ? count.toFixed(decimals) : Math.round(count);

  return (
    <span>
      {prefix}{formatted}{suffix}
    </span>
  );
}
