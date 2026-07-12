# Jump Quiz Multiplayer - Web Game Realtime

Dự án web game multiplayer realtime vertical-climbing lấy cảm hứng từ Jump King, tích hợp hệ thống lưu điểm checkpoint bằng cách giải các câu hỏi trắc nghiệm (quiz). Game được thiết kế để chạy ngay lập tức mà không cần bất kỳ cấu hình hay cài đặt server backend phức tạp nào.

## 🚀 Hướng Dẫn Chạy Dự Án

Game được cấu hình đầy đủ bằng Vite, React, và TypeScript. Chỉ cần thực hiện các lệnh sau ở máy của bạn:

1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Chạy server development:**
   ```bash
   npm run dev
   ```

Mở trình duyệt truy cập vào địa chỉ hiển thị trong terminal (mặc định là `http://localhost:3000`).

---

## 🎮 Cơ Chế Gameplay Chính

### 1. Di chuyển & Nhảy (Jump King Physics)
Cơ chế vật lý nhảy được mô phỏng theo tựa game Jump King huyền thoại:
* **Di chuyển:** Chỉ có thể di chuyển trái/phải khi đang đứng trên bề mặt nền tảng (Platform). Khi ở trên không trung (trong lúc nhảy hoặc rơi), người chơi **hoàn toàn không thể điều khiển** hướng di chuyển.
* **Gồng lực nhảy:** Giữ phím `Space` để tích tụ năng lượng nhảy. Càng giữ lâu lực nhảy càng mạnh (tối đa gồng trong 0.8 giây).
* **Ngắm hướng nhảy:** Trong khi giữ `Space`, bạn có thể bấm phím di chuyển `A`/`D` hoặc phím mũi tên để ngắm góc nhảy (Nhảy chéo trái, thẳng đứng hoặc chéo phải).
* **Nảy tường (Wall Bounce):** Khi va chạm vào tường dọc ở trên không, nhân vật sẽ bị nảy ngược trở lại theo góc phản xạ với lực đàn hồi `0.65`, tạo ra những pha nảy tường đầy kịch tính.
* **Rơi tự do:** Nếu nhảy hụt, bạn sẽ rơi xuống các platform thấp hơn hoặc rơi thẳng về mặt đất. Không có cơ chế chết hay mất mạng, người chơi tiếp tục hành trình từ vị trí rơi xuống.

### 2. Hệ thống Lưu Checkpoint & Quiz
Trên đường leo núi có nhiều vùng phát sáng xanh dương (Checkpoint). Khi đứng tại đây:
* Game hiển thị popup gợi ý lưu checkpoint. Bạn có thể chọn `Continue` để tiếp tục leo mà không lưu, hoặc chọn `Save` để trả lời câu hỏi.
* **Quiz:** Một câu hỏi trắc nghiệm hiện lên từ tệp câu hỏi của phòng chơi.
  * **Nếu đúng:** Điểm checkpoint được lưu lại thành công.
  * **Nếu sai:** Checkpoint không được lưu, và hệ thống sẽ **khóa nút trả lời trong 5 giây**. Bạn phải chờ hết thời gian đếm ngược mới được trả lời lại chính câu hỏi đó.
* **Hồi sinh (Respawn):** Khi gặp sự cố rơi hoặc muốn quay lại, người chơi bấm phím `R` hoặc nút `Respawn` trên màn hình. Nhân vật sẽ ngay lập tức biến về checkpoint gần nhất đã lưu (nếu chưa lưu checkpoint nào sẽ về điểm xuất phát).

### 3. Các Phím Tắt Tiện Ích
* `A`/`D` hoặc `←`/`→`: Di chuyển trái/phải & Ngắm hướng nhảy.
* `Space` (Giữ & Thả): Gồng lực và nhảy.
* `R`: Hồi sinh (Respawn) về checkpoint đã lưu.
* `Tab` (Giữ): Hiện bảng xếp hạng (Leaderboard) realtime.
* `Esc`: Hiện Bảng xếp hạng hoặc Menu.
* `H`: Ẩn/Hiện khung hướng dẫn phím tắt trên giao diện HUD.

---

## 👥 Chế Độ Multiplayer Realtime & Đồng Bộ

Game hỗ trợ chơi nhiều người cùng lúc, tất cả người chơi trong phòng sẽ hiển thị trên màn hình của nhau dưới dạng thực thể mờ (`opacity: 50%`) để không cản trở góc nhìn:

### 1. Cơ Chế Kết Nối Không Cần Cấu Hình (Out-of-the-box)
Để đảm bảo game có thể hoạt động ngay sau khi chạy `npm run dev`:
* **BroadcastChannel Fallback (Mặc định):** Nếu không cấu hình Firebase, game sẽ sử dụng API `BroadcastChannel` của trình duyệt. Điều này cho phép bạn mở nhiều tab trình duyệt cạnh nhau trên cùng một máy tính để kiểm tra và chơi multiplayer mà không cần kết nối mạng internet.
* **Cấu hình Firebase Realtime Database:** Tại trang chủ, click nút **Cấu hình** ở góc dưới. Bạn có thể dán đoạn cấu hình Firebase Web App JSON của riêng mình. Sau khi lưu cấu hình, game sẽ chuyển sang đồng bộ qua internet thực sự giữa các thiết bị khác nhau.

### 2. Giao diện Host & Spectator (Camera Giám Sát)
* Người tạo phòng (Host) sẽ đóng vai trò là trọng tài kiêm camera giám sát tự do.
* Host không có nhân vật điều khiển. Camera của Host có thể pan tự do bằng các phím `W`/`A`/`S`/`D`, phím mũi tên hoặc nhấn giữ chuột trái để kéo camera đi khắp bản đồ.
* Host có bảng điều khiển để: **Bắt đầu game (Start)**, **Tạm dừng game**, **Kết thúc game** và **Chơi lại ván mới**.
* Đặc biệt, Host có danh sách người chơi và nút **Spectate** (Hình con mắt) để gắn camera di chuyển theo sát bất kỳ người chơi nào.

---

## ⚙️ Tệp Câu Hỏi Checkpoint Mẫu

Phòng chơi đi kèm bộ câu hỏi mặc định có sẵn tại `public/default_questions.json`.
Host có thể tự thiết kế file JSON câu hỏi riêng và tải lên (Upload) khi tạo phòng. Cấu trúc file JSON mẫu như sau:

```json
[
  {
    "question": "Kết quả của phép tính: 2 + 2 * 2 = ?",
    "answers": ["8", "6", "4", "2"],
    "correct": 1
  }
]
```
*(Trong đó `correct` là chỉ số index của đáp án đúng trong mảng `answers`, bắt đầu từ 0).*
