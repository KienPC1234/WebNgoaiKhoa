import React from 'react'

export default function DieuKhoanSuDung() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-extrabold text-fpt-blue">Điều khoản sử dụng</h1>

      <div className="prose prose-slate max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-slate-800">1. Chấp nhận điều khoản</h2>
          <p className="text-slate-600 leading-relaxed">
            Bằng việc truy cập và sử dụng website Ngoại Khoa FPT Education, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản sử dụng dưới đây. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">2. Sử dụng website</h2>
          <p className="text-slate-600 leading-relaxed">
            Website này được xây dựng nhằm mục đích giới thiệu và chia sẻ thông tin về các hoạt động ngoại khoa tại FPT Education. Người dùng có thể:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Đọc và tìm hiểu về các sự kiện, câu chuyện truyền cảm hứng</li>
            <li>Đăng ký tài khoản để tham gia bình luận và tương tác</li>
            <li>Nộp bài dự thi cho các cuộc thi được tổ chức</li>
            <li>Theo dõi các hoạt động ngoại khoa của trường</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">3. Tài khoản người dùng</h2>
          <p className="text-slate-600 leading-relaxed">
            Khi tạo tài khoản trên website, bạn cam kết cung cấp thông tin chính xác và đầy đủ. Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu của mình. Mọi hoạt động diễn ra dưới tài khoản của bạn đều thuộc trách nhiệm của bạn.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">4. Nội dung người dùng</h2>
          <p className="text-slate-600 leading-relaxed">
            Khi đăng tải nội dung lên website (bình luận, bài dự thi, v.v.), bạn đảm bảo rằng:
          </p>
          <ul className="list-disc pl-6 text-slate-600 space-y-2">
            <li>Nội dung là của bạn hoặc bạn có quyền sử dụng</li>
            <li>Nội dung không vi phạm quyền của bên thứ ba</li>
            <li>Nội dung không chứa thông tin sai lệch, xúc phạm hoặc bất hợp pháp</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">5. Quyền sở hữu trí tuệ</h2>
          <p className="text-slate-600 leading-relaxed">
            Tất cả nội dung trên website (văn bản, hình ảnh, logo, thiết kế) thuộc quyền sở hữu của FPT Education hoặc các đối tác được cấp phép. Nghiêm cấm sao chép, phân phối hoặc sử dụng nội dung cho mục đích thương mại mà không có sự cho phép bằng văn bản.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">6. Giới hạn trách nhiệm</h2>
          <p className="text-slate-600 leading-relaxed">
            Website được cung cấp trên cơ sở "như hiện có". Chúng tôi không đảm bảo website sẽ hoạt động liên tục, không lỗi hoặc an toàn tuyệt đối. Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại nào phát sinh từ việc sử dụng website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">7. Thay đổi điều khoản</h2>
          <p className="text-slate-600 leading-relaxed">
            Chúng tôi có quyền sửa đổi các điều khoản này vào bất kỳ thời điểm nào. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên website. Việc tiếp tục sử dụng website sau khi thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800">8. Liên hệ</h2>
          <p className="text-slate-600 leading-relaxed">
            Nếu bạn có bất kỳ câu hỏi nào về điều khoản sử dụng, vui lòng liên hệ với chúng tôi qua email: <a href="mailto:contact@fpt.edu.vn" className="text-fpt-blue hover:underline">contact@fpt.edu.vn</a>
          </p>
        </section>

        <p className="text-sm text-slate-400 mt-8">
          Cập nhật lần cuối: Tháng 5, 2026
        </p>
      </div>
    </div>
  )
}
