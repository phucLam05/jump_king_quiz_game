# Jump Quiz Multiplayer - AI Agent Specification

## Mục tiêu

Xây dựng web game multiplayer realtime lấy cảm hứng từ Jump King...

### Gameplay

-   Leo lên cao, điểm = độ cao cao nhất.
-   Không có cơ chế chết. Rơi thì rơi đến platform gần nhất.
-   Respawn thủ công bằng nút hoặc phím R về checkpoint đã lưu.
-   Nếu chưa có checkpoint thì về điểm xuất phát.

### Checkpoint

-   Đứng trong vùng checkpoint sẽ hiện lựa chọn Save hoặc Continue.
-   Continue bỏ qua.
-   Save mở câu hỏi.
-   Đúng: lưu checkpoint.
-   Sai: khóa trả lời 5 giây rồi mới thử lại.
-   Mỗi checkpoint dùng một câu hỏi duy nhất, không lặp trong trận.

### Multiplayer

-   Tạo phòng, Join bằng Room ID và tên.
-   Thấy tất cả người chơi.
-   Nhân vật người khác làm mờ (blur + opacity).

### Host

-   Tạo phòng.
-   Chọn map.
-   Upload JSON câu hỏi.
-   Start/Stop/End game.
-   Camera tự do và spectate.

### Kết thúc

-   Có người tới đích: xếp theo thời gian hoàn thành, người chưa xong
    theo độ cao.
-   Hết giờ chưa ai tới đích: xếp theo độ cao.

### Mobile

-   Responsive.
-   Joystick trái.
-   Jump phải.
-   Respawn trên Jump.
-   HUD gọn.

### Tech

-   React + TypeScript + Vite
-   Phaser 3
-   TailwindCSS
-   Firebase Realtime Database hoặc Supabase Realtime.
-   Không backend/server riêng.
-   npm install && npm run dev chạy được.
