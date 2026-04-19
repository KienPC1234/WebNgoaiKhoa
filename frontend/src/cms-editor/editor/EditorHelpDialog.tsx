import React from 'react'

interface EditorHelpDialogProps {
  open: boolean
  onClose: () => void
}

export const EditorHelpDialog: React.FC<EditorHelpDialogProps> = ({ open, onClose }) => {
  React.useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/55 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hướng dẫn sử dụng CMS Editor"
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-base font-black uppercase tracking-widest text-fpt-blue">Hướng Dẫn CMS Editor</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Tài liệu đầy đủ để biên tập nội dung hiệu quả và nhất quán</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100"
          >
            Đóng
          </button>
        </div>

        <div className="custom-scrollbar max-h-[calc(90vh-74px)] space-y-6 overflow-y-auto px-6 py-5 text-sm leading-7 text-slate-700">
          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">1. Mục Tiêu Và Tư Duy Biên Tập</h3>
            <p>
              CMS Editor là trình biên tập nội dung theo mô hình khối, cho phép bạn xây dựng bài viết bằng cách ghép các thành phần nhỏ như đoạn văn,
              ảnh, video, bảng, mục lục, mục và các khối bố cục. Tư duy tốt nhất là chia nội dung thành từng ý rõ ràng, sau đó bố trí mỗi ý vào một hoặc
              nhiều khối phù hợp thay vì dồn toàn bộ vào một đoạn dài.
            </p>
            <p>
              Mỗi tài liệu được quản lý theo lưới 12 cột, vì vậy bạn có thể điều khiển độ rộng từng khối để tạo nhịp đọc tốt hơn. Hệ thống hỗ trợ kéo thả,
              lồng khối con, tự động lưu và chế độ xem trước sát với giao diện xuất bản.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">2. Tổng Quan Giao Diện</h3>
            <p>
              Giao diện được chia thành ba vùng chính: Thanh thông tin tài liệu ở trên, cột trái quản lý khối, và vùng nội dung bên phải để biên tập.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Không gian biên tập: Hiển thị phiên bản tài liệu, trạng thái hợp lệ, nút hoàn tác và làm lại. Nút Trợ giúp cũng nằm tại đây để mở hướng dẫn.
              </li>
              <li>
                Tài liệu: Cho phép chỉnh tiêu đề tài liệu tổng thể nếu chế độ hiển thị tiêu đề được bật.
              </li>
              <li>
                Thư viện khối: Dùng để chèn khối mới bằng cách tìm kiếm và chọn lệnh.
              </li>
              <li>
                Vùng nội dung: Khu vực chính để kéo thả, chỉnh sửa trực tiếp và xem trước nội dung.
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">3. Cách Chèn Khối Mới</h3>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Vào Thư viện khối ở cột trái.</li>
              <li>Gõ từ khóa để lọc nhanh theo tên khối, ví dụ: đoạn văn, ảnh, video, mục, bảng, mục lục.</li>
              <li>Nhấn vào lệnh để chèn khối vào cuối tài liệu.</li>
              <li>Khối mới sẽ xuất hiện trên canvas và có thể kéo đến vị trí mong muốn.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">4. Chỉnh Sửa Trực Tiếp Trên Canvas</h3>
            <p>
              Khi bấm chọn một khối, bạn sẽ thấy khu vực chỉnh nhanh ngay trong thẻ khối đó. Tùy loại khối, hệ thống hiển thị input, textarea, trình soạn
              thảo rich text, hoặc công cụ chuyên biệt như bảng.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Đoạn văn: Chỉnh bằng trình soạn rich text hỗ trợ định dạng, danh sách, liên kết, ảnh.</li>
              <li>Ảnh hoặc video: Cập nhật URL và kích thước hiển thị.</li>
              <li>Danh sách: Mỗi dòng là một mục.</li>
              <li>Bảng: Dùng công cụ bảng để thêm hoặc xóa hàng cột, gộp và tách ô.</li>
              <li>Xóa khối: Chọn khối cần xóa và nhấn phím <strong>Delete</strong> (Del). Thao tác có thể hoàn tác bằng Hoàn tác (Undo).</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">5. Kéo Thả, Sắp Xếp Và Lồng Khối</h3>
            <p>
              Mỗi khối có nút Kéo ở góc phải trên. Bạn giữ và kéo để đổi vị trí trong cùng cấp hoặc chuyển sang vị trí khác. Hệ thống hiển thị vùng thả
              để bạn biết chính xác khối sẽ được đặt ở đâu.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Kéo trong cùng danh sách để đổi thứ tự ưu tiên hiển thị.</li>
              <li>Thả vào vùng Nội dung con để tạo cấu trúc lồng nhau.</li>
              <li>Sử dụng khối Mục làm khung cha để gom nhiều khối con theo từng chương hoặc phần.</li>
            </ol>
            <p>
              Để giữ bài viết rõ ràng, nên lồng khối ở mức vừa đủ. Tránh lồng quá sâu khi không cần thiết vì sẽ làm khó theo dõi và khó bảo trì về sau.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">6. Điều Chỉnh Độ Rộng Khối</h3>
            <p>
              Canvas dùng lưới 12 cột. Mỗi khối có thuộc tính độ rộng từ 1 đến 12. Khi nhập giá trị độ rộng, hệ thống áp dụng sau 1 giây khi bạn ngừng nhập,
              giúp tránh giật bố cục liên tục.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Chọn khối cần chỉnh.</li>
              <li>Nhập giá trị tại ô Rộng.</li>
              <li>Chờ 1 giây để hệ thống tự áp dụng.</li>
              <li>Nhấn Escape nếu muốn hủy bản nháp vừa nhập và quay về giá trị hiện tại.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">7. Mục, Mục Lục Và Điều Hướng Nội Bộ</h3>
            <p>
              Khối Mục được dùng như tiêu đề phần có thể chứa khối con. Khối Mục lục sẽ tự động quét toàn bộ các khối Mục trong tài liệu, kể cả cấp lồng
              bên trong, để tạo danh sách điều hướng phân cấp.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Thêm các khối Mục theo cấu trúc chương mục mong muốn.</li>
              <li>Lồng Mục con trong Mục cha khi cần tạo mục lớn và mục nhỏ.</li>
              <li>Chèn một khối Mục lục tại vị trí bạn muốn hiển thị điều hướng.</li>
              <li>Ở chế độ xem, bấm vào từng dòng mục lục để cuộn mượt đến đúng phần nội dung.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">8. Chế Độ Chỉnh Sửa Và Xem Trước</h3>
            <p>
              Nút Chỉnh sửa và Xem trước ở đầu vùng nội dung giúp bạn chuyển nhanh giữa hai ngữ cảnh làm việc.
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Chỉnh sửa: Tối ưu cho thao tác, cho phép kéo thả và sửa khối trực tiếp.</li>
              <li>Xem trước: Dùng bộ render xuất bản để mô phỏng trải nghiệm người đọc thực tế.</li>
            </ol>
            <p>
              Thói quen tốt là kiểm tra ở chế độ xem trước trước khi lưu phiên bản cuối, đặc biệt với bài có nhiều khối media và cấu trúc lồng phức tạp.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">9. Tự Động Lưu, Hoàn Tác Và Làm Lại</h3>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Tự động lưu: Hệ thống ghi nhận thay đổi định kỳ, hạn chế mất dữ liệu khi thao tác dài.</li>
              <li>Hoàn tác: Quay lại thao tác trước đó nếu chỉnh sai.</li>
              <li>Làm lại: Khôi phục thao tác vừa hoàn tác.</li>
            </ol>
            <p>
              Nếu bạn đang thử nghiệm bố cục mới, nên tạo theo từng cụm thao tác nhỏ để dễ hoàn tác chính xác hơn.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">10. Kiểm Tra Hợp Lệ Và Chất Lượng Nội Dung</h3>
            <p>
              Trạng thái hợp lệ hiển thị ở đầu trang giúp bạn biết tài liệu có lỗi cấu trúc hay không. Khi có lỗi, số lượng lỗi sẽ được báo trực tiếp.
              Trước khi xuất bản, bạn nên rà soát các điểm sau:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Tiêu đề tài liệu rõ ràng, đúng ngữ cảnh.</li>
              <li>Khối media có URL hợp lệ và hiển thị đúng tỷ lệ.</li>
              <li>Mục lục bám đúng hệ thống Mục.</li>
              <li>Nội dung đoạn văn không bị trùng hoặc còn placeholder.</li>
              <li>Bố cục cột không quá dày trên màn hình nhỏ.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">11. Mẹo Sử Dụng Hiệu Quả</h3>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Bắt đầu bằng khung dàn ý: tạo Mục trước, đổ nội dung sau.</li>
              <li>Ưu tiên khối đơn giản cho nội dung cốt lõi, chỉ dùng media khi thực sự tăng giá trị.</li>
              <li>Giữ nhịp đọc: xen kẽ đoạn văn, ảnh, danh sách và tiêu đề để tránh mệt mắt.</li>
              <li>Kiểm tra xem trước sau mỗi cụm chỉnh sửa lớn.</li>
              <li>Dùng tên phần ngắn gọn, nhất quán để mục lục dễ đọc.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">12. Sự Cố Thường Gặp Và Cách Xử Lý</h3>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Khối không đổi rộng ngay: chờ 1 giây sau khi ngừng nhập.</li>
              <li>Kéo thả không vào được khối cha: kiểm tra bạn đang thả đúng vùng Nội dung con.</li>
              <li>Mục lục không hiện mục: kiểm tra tài liệu đã có khối Mục và tiêu đề Mục không rỗng.</li>
              <li>Xem trước khác kỳ vọng: kiểm tra lại kích thước media và cấu trúc lồng khối.</li>
              <li>Lỡ xóa hoặc chỉnh sai: dùng Hoàn tác, sau đó tinh chỉnh lại từng bước.</li>
            </ol>
          </section>

          <section className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-fpt-blue">Checklist Trước Khi Hoàn Thành Bài</h3>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Tiêu đề tài liệu và các Mục chính đã đầy đủ.</li>
              <li>Mục lục điều hướng đúng tất cả phần quan trọng.</li>
              <li>Bố cục 12 cột cân đối, không có khối quá chật.</li>
              <li>Nội dung đã qua chế độ Xem trước và không còn lỗi hợp lệ.</li>
              <li>Thông điệp chính rõ ràng, dễ đọc trên cả desktop và mobile.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
