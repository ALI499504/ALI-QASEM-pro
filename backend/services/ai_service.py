from __future__ import annotations

import json
import os
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Literal
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Optional AI imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


@dataclass
class MarketContext:
    """Market context for AI analysis."""
    symbol: str
    current_price: float
    trend: str
    rsi: Optional[float]
    macd: Optional[float]
    sma_20: Optional[float]
    sma_50: Optional[float]
    bollinger_upper: Optional[float]
    bollinger_lower: Optional[float]
    zones: List[Dict[str, Any]]
    volume: Optional[float]
    change_pct: Optional[float]


@dataclass
class AITradingSignal:
    """AI-generated trading signal."""
    action: Literal["buy", "sell", "hold"]
    confidence: float
    reasoning: str
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[List[float]] = None
    risk_reward_ratio: Optional[float] = None
    timeframe: str = "1d"
    reasoning_details: Optional[str] = None


class AIService:
    """AI-powered trading analysis and signal generation."""
    
    def __init__(self):
        self.openai_client = None
        self.anthropic_client = None
        self._init_clients()
    
    def _init_clients(self):
        """Initialize AI clients if available."""
        openai_key = os.getenv("OPENAI_API_KEY")
        if OPENAI_AVAILABLE and openai_key:
            self.openai_client = openai.OpenAI(api_key=openai_key)
            logger.info("OpenAI client initialized")
        
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if ANTHROPIC_AVAILABLE and anthropic_key:
            self.anthropic_client = anthropic.Anthropic(api_key=anthropic_key)
            logger.info("Anthropic client initialized")
    
    def is_available(self) -> bool:
        """Check if any AI provider is available."""
        return self.openai_client is not None or self.anthropic_client is not None
    
    def _build_market_prompt(self, context: MarketContext) -> str:
        """Build a comprehensive market analysis prompt."""
        return f"""
You are a professional quantitative analyst and trading strategist with 20+ years of experience in institutional trading. Analyze the following market data and provide a precise trading recommendation.

MARKET DATA FOR {context.symbol}:
- Current Price: ${context.current_price:,.2f}
- 24h Change: {context.change_pct:+.2f}%
- Trend: {context.trend}
- Volume: {context.volume:,.0f} if available

TECHNICAL INDICATORS:
- RSI: {context.rsi:.1f} if available
- MACD: {context.macd:.4f} if available
- SMA 20: ${context.sma_20:,.2f} if available
- SMA 50: ${context.sma_50:,.2f} if available
- Bollinger Upper: ${context.bollinger_upper:,.2f} if available
- Bollinger Lower: ${context.bollinger_lower:,.2f} if available
- Current Price vs BB: {(context.current_price - context.bollinger_lower) / (context.bollinger_upper - context.bollinger_lower) * 100:.1f}% if available

SUPPORT/RESISTANCE ZONES:
{self._format_zones(context.zones)}

TRADING RULES:
1. Only recommend BUY/SELL when confidence >= 70%
2. Always provide clear entry, stop loss, and take profit levels
3. Risk/Reward must be >= 1.5:1 for BUY/SELL signals
4. Consider risk management: max 2% account risk per trade
5. Provide detailed reasoning for every recommendation

RESPONSE FORMAT (JSON):
{{
  "action": "buy|sell|hold",
  "confidence": 0.0-1.0,
  "reasoning": "Brief 2-3 sentence summary",
  "entry_price": float or null,
  "stop_loss": float or null,
  "take_profit": [float, float] or null,
  "risk_reward_ratio": float or null,
  "timeframe": "1d|4h|1h",
  "reasoning_details": "Detailed technical analysis explanation"
}}
"""
    
    def _format_zones(self, zones: List[Dict[str, Any]]) -> str:
        """Format zones for prompt."""
        if not zones:
            return "No significant zones detected"
        lines = []
        for z in zones[:8]:
            lines.append(f"  - {z.get('zone_type', '').upper()}: ${z.get('high', 0):,.2f} - ${z.get('low', 0):,.2f} (strength: {z.get('strength', 0):.2f}, touches: {z.get('test_count', 0)})")
        return "\n".join(lines)
    
    async def analyze_market(self, context: MarketContext) -> AITradingSignal:
        """Generate AI trading signal from market context."""
        if not self.is_available():
            return AITradingSignal(
                action="hold",
                confidence=0.0,
                reasoning="AI service not configured. Please add OPENAI_API_KEY or ANTHROPIC_API_KEY."
            )
        
        prompt = self._build_market_prompt(context)
        
        try:
            if self.anthropic_client:
                return await self._analyze_with_anthropic(prompt)
            elif self.openai_client:
                return await self._analyze_with_openai(prompt)
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return AITradingSignal(
                action="hold",
                confidence=0.0,
                reasoning=f"AI analysis failed: {str(e)}"
            )
        
        return AITradingSignal(action="hold", confidence=0.0, reasoning="No AI provider available")
    
    async def _analyze_with_anthropic(self, prompt: str) -> AITradingSignal:
        """Analyze with Anthropic Claude."""
        response = await self.anthropic_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            temperature=0.3,
            system="You are an expert quantitative analyst and institutional trader. Provide precise, actionable trading signals with strict risk management.",
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text
        return self._parse_ai_response(content)
    
    async def _analyze_with_openai(self, prompt: str) -> AITradingSignal:
        """Analyze with OpenAI GPT."""
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            max_tokens=2000,
            temperature=0.3,
            messages=[
                {"role": "system", "content": "You are an expert quantitative analyst and institutional trader. Provide precise, actionable trading signals with strict risk management."},
                {"role": "user", "content": prompt}
            ]
        )
        
        content = response.choices[0].message.content
        return self._parse_ai_response(content)
    
    def _parse_ai_response(self, content: str) -> AITradingSignal:
        """Parse AI response into structured signal."""
        try:
            # Try to extract JSON from response
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = content[start:end]
                data = json.loads(json_str)
                
                return AITradingSignal(
                    action=data.get("action", "hold"),
                    confidence=float(data.get("confidence", 0)),
                    reasoning=data.get("reasoning", ""),
                    entry_price=data.get("entry_price"),
                    stop_loss=data.get("stop_loss"),
                    take_profit=data.get("take_profit"),
                    risk_reward_ratio=data.get("risk_reward_ratio"),
                    timeframe=data.get("timeframe", "1d"),
                    reasoning_details=data.get("reasoning_details")
                )
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
        
        return AITradingSignal(
            action="hold",
            confidence=0.0,
            reasoning="Failed to parse AI response"
        )


# Global instance
_ai_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    """Get or create global AI service instance."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service