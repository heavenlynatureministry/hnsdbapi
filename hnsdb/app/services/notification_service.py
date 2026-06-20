"""
Notification Service
Handles email notifications using Brevo (Sendinblue) API
"""
from typing import Optional, Dict, Any, List
import logging
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Email notification service using Brevo API"""
    
    @staticmethod
    def _get_brevo_configuration():
        """Get configured Brevo API instance"""
        if not settings.BREVO_API_KEY:
            logger.warning("Brevo API key not configured")
            return None
        
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = settings.BREVO_API_KEY
        return configuration
    
    @staticmethod
    async def send_email(
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send transactional email via Brevo API
        
        Args:
            to_email: Recipient email
            to_name: Recipient name
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text body (optional)
            cc_emails: CC recipients
            bcc_emails: BCC recipients
            attachments: List of attachment dicts [{"name": "...", "content": "base64..."}]
            reply_to: Reply-to email address
            
        Returns:
            Response dictionary
        """
        configuration = NotificationService._get_brevo_configuration()
        
        if not configuration:
            return {
                "success": False,
                "message": "Email service not configured",
                "message_id": None
            }
        
        if not settings.EMAIL_ENABLED:
            logger.info(f"Email disabled. Would have sent to: {to_email}")
            return {
                "success": True,
                "message": "Email disabled. Message not sent.",
                "message_id": None
            }
        
        try:
            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                sib_api_v3_sdk.ApiClient(configuration)
            )
            
            # Build sender
            sender = {
                "name": settings.EMAIL_FROM_NAME,
                "email": settings.EMAIL_FROM
            }
            
            # Build recipient
            to = [{"name": to_name, "email": to_email}]
            
            # Add CC
            cc = None
            if cc_emails:
                cc = [{"email": email} for email in cc_emails]
            
            # Add BCC
            bcc = None
            if bcc_emails:
                bcc = [{"email": email} for email in bcc_emails]
            
            # Build email
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                sender=sender,
                to=to,
                cc=cc,
                bcc=bcc,
                reply_to={"email": reply_to or settings.EMAIL_FROM},
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )
            
            # Add attachments if any
            if attachments:
                send_smtp_email.attachment = []
                for att in attachments:
                    send_smtp_email.attachment.append({
                        "name": att.get("name", "attachment"),
                        "content": att.get("content", "")
                    })
            
            # Send email
            api_response = api_instance.send_transac_email(send_smtp_email)
            
            logger.info(f"Email sent to {to_email}: {subject} (Message ID: {api_response.message_id})")
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "message_id": api_response.message_id
            }
            
        except ApiException as e:
            logger.error(f"Brevo API error: {e}")
            return {
                "success": False,
                "message": f"Failed to send email: {str(e)}",
                "message_id": None
            }
        except Exception as e:
            logger.error(f"Email sending error: {e}")
            return {
                "success": False,
                "message": f"Unexpected error: {str(e)}",
                "message_id": None
            }
    
    @staticmethod
    async def send_welcome_email(
        to_email: str,
        to_name: str,
        temp_password: str
    ) -> Dict[str, Any]:
        """
        Send welcome email to new user
        
        Args:
            to_email: New user email
            to_name: New user name
            temp_password: Temporary password
            
        Returns:
            Response dictionary
        """
        subject = f"Welcome to {settings.SCHOOL_SHORT_NAME} School Management System"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1a56db; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">{settings.SCHOOL_NAME}</h1>
                <p style="color: #cbd5e1; margin: 5px 0 0 0;">{settings.SCHOOL_MOTTO}</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #1a56db;">Welcome, {to_name}!</h2>
                
                <p>Your account has been created on the {settings.SCHOOL_SHORT_NAME} School Management System.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Login Details:</strong></p>
                    <p style="margin: 5px 0;">📧 Email: <strong>{to_email}</strong></p>
                    <p style="margin: 5px 0;">🔑 Temporary Password: <strong>{temp_password}</strong></p>
                </div>
                
                <p style="color: #ef4444; font-weight: bold;">
                    ⚠️ Please change your password after your first login.
                </p>
                
                <a href="{settings.SCHOOL_WEBSITE or '#'}" 
                   style="display: inline-block; background-color: #1a56db; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                          margin-top: 20px;">
                    Login to Your Account
                </a>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                <p>This is an automated message from {settings.SCHOOL_NAME}.</p>
                <p>📞 {settings.SCHOOL_PHONE} | 📧 {settings.SCHOOL_EMAIL}</p>
                <p>📍 {settings.SCHOOL_ADDRESS}</p>
            </div>
        </div>
        """
        
        return await NotificationService.send_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            html_content=html_content
        )
    
    @staticmethod
    async def send_password_reset_email(
        to_email: str,
        to_name: str,
        reset_link: str
    ) -> Dict[str, Any]:
        """
        Send password reset email
        
        Args:
            to_email: User email
            to_name: User name
            reset_link: Password reset link
            
        Returns:
            Response dictionary
        """
        subject = f"Password Reset - {settings.SCHOOL_SHORT_NAME} School Management System"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1a56db; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">{settings.SCHOOL_NAME}</h1>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
                <h2 style="color: #1a56db;">Password Reset Request</h2>
                
                <p>Hello {to_name},</p>
                
                <p>We received a request to reset your password for the {settings.SCHOOL_SHORT_NAME} 
                   School Management System.</p>
                
                <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
                
                <a href="{reset_link}" 
                   style="display: inline-block; background-color: #1a56db; color: white; 
                          padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                          margin: 20px 0;">
                    Reset Password
                </a>
                
                <p style="color: #6b7280; font-size: 14px;">
                    If you did not request this reset, please ignore this email or contact 
                    the administrator.
                </p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                <p>This is an automated message from {settings.SCHOOL_NAME}.</p>
                <p>📞 {settings.SCHOOL_PHONE} | 📧 {settings.SCHOOL_EMAIL}</p>
            </div>
        </div>
        """
        
        return await NotificationService.send_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            html_content=html_content
        )
    
    @staticmethod
    async def send_attendance_alert(
        to_email: str,
        to_name: str,
        student_name: str,
        attendance_rate: float,
        alert_type: str
    ) -> Dict[str, Any]:
        """
        Send attendance alert email to parent/guardian
        
        Args:
            to_email: Guardian email
            to_name: Guardian name
            student_name: Student name
            attendance_rate: Current attendance rate
            alert_type: warning or critical
            
        Returns:
            Response dictionary
        """
        alert_color = "#ef4444" if alert_type == "critical" else "#f59e0b"
        alert_title = "Critical Attendance Alert" if alert_type == "critical" else "Attendance Warning"
        
        subject = f"{alert_title} - {student_name}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: {alert_color}; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">{alert_title}</h1>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
                <p>Dear {to_name},</p>
                
                <p>This is to inform you that <strong>{student_name}</strong> has an attendance 
                   rate of <strong style="color: {alert_color};">{attendance_rate}%</strong>.</p>
                
                <p>Regular attendance is crucial for academic success. Please ensure your child 
                   attends school regularly.</p>
                
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;">📞 Please contact the school if there are any issues 
                       affecting your child's attendance.</p>
                </div>
                
                <p>School Contact: <strong>{settings.SCHOOL_PHONE}</strong></p>
            </div>
            
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                <p>{settings.SCHOOL_NAME} | 📧 {settings.SCHOOL_EMAIL}</p>
            </div>
        </div>
        """
        
        return await NotificationService.send_email(
            to_email=to_email,
            to_name=to_name,
            subject=subject,
            html_content=html_content
        )