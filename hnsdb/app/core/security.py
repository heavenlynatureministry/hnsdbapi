# =========================================================================
# RATE LIMITING
# =========================================================================

class RateLimiter:
    """Simple in-memory rate limiter"""

    _requests: Dict[str, List[datetime]] = {}

    @classmethod
    def is_rate_limited(
        cls,
        key: str,
        max_requests: int = None,
        window_seconds: int = None
    ) -> bool:
        """
        Check if request should be rate limited
        """
        if not settings.RATE_LIMIT_ENABLED:
            return False

        max_req = max_requests or settings.RATE_LIMIT_REQUESTS
        window = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS

        now = datetime.utcnow()
        window_start = now - timedelta(seconds=window)

        if key in cls._requests:
            cls._requests[key] = [
                t for t in cls._requests[key] if t > window_start
            ]
        else:
            cls._requests[key] = []

        if len(cls._requests[key]) >= max_req:
            return True

        cls._requests[key].append(now)
        return False

    @classmethod
    def get_remaining(cls, key: str) -> int:
        max_req = settings.RATE_LIMIT_REQUESTS
        return max(0, max_req - len(cls._requests.get(key, [])))

    @classmethod
    def reset(cls, key: str):
        if key in cls._requests:
            del cls._requests[key]

    # ============================================================
    # 🔐 NEW: LOGIN BRUTE FORCE PROTECTION
    # ============================================================

    @classmethod
    def check_login_limit(cls, ip: str, email: str) -> None:
        """
        Enforce login rate limits for IP + email.
        Raises HTTPException if blocked.
        """
        from fastapi import HTTPException, status

        ip_key = f"login:ip:{ip}"
        email_key = f"login:email:{email.lower()}"

        # -------------------------------
        # IP-based protection (global)
        # -------------------------------
        if cls.is_rate_limited(
            ip_key,
            max_requests=20,
            window_seconds=900  # 15 minutes
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts from this IP. Please try again later."
            )

        # -------------------------------
        # Email-based protection (targeted brute force)
        # -------------------------------
        if cls.is_rate_limited(
            email_key,
            max_requests=10,
            window_seconds=900  # 15 minutes
        ):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts for this account. Please try again later."
            )
