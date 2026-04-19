import html
from typing import Optional

def get_base_html_template(content_html: str, unsubscribe_link: Optional[str] = None) -> str:
    """
    Wraps content in a standard, modern HTML template for emails.
    """
    unsubscribe_section = ""
    if unsubscribe_link:
        unsubscribe_section = f"""
        <div style="margin-top: 24px; text-align: center; border-top: 1px solid #eef2f6; padding-top: 24px;">
            <p style="font-size: 11px; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                Thông báo từ hệ thống Tổ Xã Hội
            </p>
            <p style="font-size: 13px; color: #64748b;">
                Bạn không muốn nhận email này? 
                <a href="{unsubscribe_link}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Hủy đăng ký tại đây</a>
            </p>
        </div>
        """

    return f"""
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td align="left" style="padding: 32px 40px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <div style="display: inline-block; background-color: #f58020; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 18px; letter-spacing: -0.02em;">
                                            Tổ Xã Hội
                                        </div>
                                    </td>
                                    <td align="right">
                                        <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">
                                            FPT Education
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Main Content Area -->
                    <tr>
                        <td style="padding: 40px 40px 32px 40px;">
                            {content_html}
                        </td>
                    </tr>
                    <!-- Footer Area -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #fcfdfe; border-top: 1px solid #f1f5f9;">
                            <div style="text-align: center;">
                                <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #475569;">Ban Chuyên môn Tổ Xã Hội</p>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                                    Đại học FPT Hà Nội, Khu Công nghệ cao Hòa Lạc,<br>
                                    Thạch Thất, Hà Nội, Việt Nam
                                </p>
                            </div>
                            {unsubscribe_section}
                        </td>
                    </tr>
                </table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                    <tr>
                        <td style="padding: 24px 0; text-align: center; color: #94a3b8; font-size: 12px;">
                            &copy; 2026 Tổ Xã Hội - FPT Education. All rights reserved.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

def get_otp_html(otp: str, expire_minutes: int, unsubscribe_link: Optional[str] = None) -> str:
    content = f"""
    <h2 style="margin-top: 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px;">Xác thực tài khoản</h2>
    <p style="font-size: 16px; color: #475569; margin-bottom: 32px;">Chào bạn, mã OTP để xác nhận hành động của bạn trên hệ thống <strong>Tổ Xã Hội</strong> là:</p>
    
    <div style="background-color: #fdf2f8; border: 2px solid #fce7f3; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #f58020; margin-bottom: 12px;">
            {otp}
        </div>
        <p style="margin: 0; font-size: 14px; color: #be185d; font-weight: 500;">
            Mã sẽ hết hạn sau {expire_minutes} phút
        </p>
    </div>
    
    <div style="padding: 16px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #cbd5e1;">
        <p style="margin: 0; font-size: 14px; color: #64748b;">
            💡 <strong>Lưu ý:</strong> Nếu bạn không yêu cầu mã này, có thể ai đó đã nhập nhầm email của bạn. Bạn không cần làm gì thêm, tài khoản vẫn an toàn.
        </p>
    </div>
    """
    return get_base_html_template(content, unsubscribe_link)

def get_newsletter_html(subject: str, body_text: str, action_url: Optional[str] = None, unsubscribe_link: Optional[str] = None) -> str:
    # Handle multiple paragraphs in body_text
    body_html = "".join([f'<p style="margin-bottom: 15px;">{html.escape(p)}</p>' for p in body_text.split('\n') if p.strip()])
    
    cta_section = ""
    if action_url:
        cta_section = f"""
        <div style="margin: 30px 0; text-align: center;">
            <a href="{action_url}" style="background-color: #f58020; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                Xem chi tiết
            </a>
        </div>
        """

    content = f"""
    <h2 style="margin-top: 0; color: #333333; font-size: 20px; font-weight: 600;">{html.escape(subject)}</h2>
    <div style="font-size: 16px; color: #444444; line-height: 1.8;">
        {body_html}
    </div>
    {cta_section}
    """
    return get_base_html_template(content, unsubscribe_link)
