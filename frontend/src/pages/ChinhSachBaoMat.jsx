import React from 'react'

export default function ChinhSachBaoMat() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-extrabold text-fpt-blue">Chính sách bảo mật</h1>

      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-slate-800">1. Thông tin thu thập</h2>
          <p className="text-slate-600 leading-relaxed">
            Chúng tôi thu thập các thông tin sau khi bạn sử dụng website Ngoại Khoa FPT Education:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li><strong>Thông tin cá nhân:</strong> Họ tên, email, ảnh đại diện khi bạn đăng ký tài khoản</li>
            <li><strong>Thông tin sử dụng:</strong> Trang đã xem, thời gian truy cập, loại trình duyệt</li>
            <li><strong>Nội dung do người dùng tạo:</strong> Bình luận, bài dự thi, phản hồi</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">2. Mục đích sử dụng thông tin</h2>
          <p className="text-slate-600 leading-relaxed">
            Thông tin thu thập được sử dụng để:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Cung cấp và duy trì dịch vụ website</li>
            <li>Xác thực danh tính người dùng</li>
            <li>Gửi thông báo về sự kiện, bài viết mới và hoạt động ngoại khoa</li>
            <li>Cải thiện trải nghiệm người dùng và phát triển tính năng mới</li>
            <li>Phân tích thống kê để hiểu rõ hơn về cách sử dụng website</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">3. Chia sẻ thông tin</h2>
          <p className="text-slate-600 leading-relaxed">
            Chúng tôi không bán, trao đổi hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Thông tin chỉ được chia sẻ trong các trường hợp:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Khi có yêu cầu từ cơ quan pháp luật</li>
            <li>Để bảo vệ quyền và tài sản của FPT Education</li>
            <li>Với sự đồng ý rõ ràng của bạn</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">4. Bảo mật thông tin</h2>
          <p className="text-slate-600 leading-relaxed">
            Chúng tôi áp dụng các biện pháp bảo mật phù hợp để bảo vệ thông tin cá nhân của bạn:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Mật khẩu được mã hóa bằng thuật toán băm an toàn</li>
            <li>Kết nối được mã hóa bằng SSL/TLS</li>
            <li>Kiểm soát truy cập nghiêm ngặt đối với dữ liệu người dùng</li>
            <li>Sao lưu dữ liệu định kỳ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">5. Cookie và công nghệ theo dõi</h2>
          <p className="text-slate-600 leading-relaxed">
            Website sử dụng cookie để cải thiện trải nghiệm người dùng. Cookie giúp ghi nhớ thông tin đăng nhập và tùy chọn của bạn. Bạn có thể tắt cookie trong cài đặt trình duyệt, nhưng điều này có thể ảnh hưởng đến một số tính năng của website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">6. Quyền của người dùng</h2>
          <p className="text-slate-600 leading-relaxed">
            Bạn có các quyền sau đối với thông tin cá nhân của mình:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Quyền truy cập và xem thông tin cá nhân</li>
            <li>Quyền chỉnh sửa hoặc cập nhật thông tin</li>
            <li>Quyền yêu cầu xóa tài khoản và dữ liệu</li>
            <li>Quyền rút lại sự đồng ý</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">7. Lưu trữ dữ liệu</h2>
          <p className="text-slate-600 leading-relaxed">
            Thông tin cá nhân của bạn được lưu trữ trong thời gian bạn duy trì tài khoản trên website. Khi bạn yêu cầu xóa tài khoản, chúng tôi sẽ xóa hoặc ẩn danh hóa thông tin cá nhân của bạn trong thời gian hợp lý.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">8. Thay đổi chính sách</h2>
          <p className="text-slate-600 leading-relaxed">
            Chính sách bảo mật này có thể được cập nhật theo thời gian. Chúng tôi sẽ thông báo cho bạn về bất kỳ thay đổi quan trọng nào bằng cách đăng thông báo trên website hoặc gửi email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">9. Liên hệ</h2>
          <p className="text-slate-600 leading-relaxed">
            Nếu bạn có câu hỏi về chính sách bảo mật này hoặc muốn thực hiện quyền của mình, vui lòng liên hệ:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Email: <a href="mailto:privacy@fpt.edu.vn" className="text-fpt-blue hover:underline">privacy@fpt.edu.vn</a></li>
            <li>Địa chỉ: FPT Education, Hà Nội, Việt Nam</li>
          </ul>
        </section>

        <p className="text-sm text-slate-400 mt-8">
          Cập nhật lần cuối: Tháng 5, 2026
        </p>
      </div>
    </div>
  )
}
