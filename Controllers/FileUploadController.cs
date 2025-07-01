using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using webchat.Models;

namespace webchat.Controllers
{
    [Authorize]
    public class FileUploadController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<FileUploadController> _logger;

        public FileUploadController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IWebHostEnvironment environment,
            ILogger<FileUploadController> logger)
        {
            _context = context;
            _userManager = userManager;
            _environment = environment;
            _logger = logger;
        }

        // Các phương thức hiện có giữ nguyên...

        [HttpPost]
        public async Task<IActionResult> UploadChatBackground(IFormFile file, string otherUserId)
        {
            _logger.LogInformation("=== UploadChatBackground START ===");
            _logger.LogInformation($"Received params: otherUserId={otherUserId}, file={file?.FileName ?? "null"}");

            try
            {
                // Kiểm tra xác thực
                var currentUser = await _userManager.GetUserAsync(User);
                if (currentUser == null)
                {
                    _logger.LogWarning("User not authenticated");
                    return Unauthorized(new { success = false, error = "User not authenticated" });
                }
                _logger.LogInformation($"Current user: {currentUser.Id}");

                // Kiểm tra tham số
                if (string.IsNullOrEmpty(otherUserId))
                {
                    _logger.LogWarning("otherUserId is null or empty");
                    return BadRequest(new { success = false, error = "Thiếu ID người nhận" });
                }

                // Validate otherUserId tồn tại
                var otherUser = await _userManager.FindByIdAsync(otherUserId);
                if (otherUser == null)
                {
                    _logger.LogWarning($"User not found: {otherUserId}");
                    return BadRequest(new { success = false, error = "Không tìm thấy người dùng với ID này" });
                }
                _logger.LogInformation($"Other user found: {otherUser.Id}, {otherUser.UserName}");

                if (file == null)
                {
                    _logger.LogWarning("file parameter is null");
                    return BadRequest(new { success = false, error = "Không có file được tải lên" });
                }

                if (file.Length == 0)
                {
                    _logger.LogWarning("file length is zero");
                    return BadRequest(new { success = false, error = "File rỗng" });
                }

                _logger.LogInformation($"File details: Name={file.FileName}, Type={file.ContentType}, Size={file.Length}");

                // Kiểm tra loại file
                var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
                if (!allowedTypes.Contains(file.ContentType.ToLower()))
                {
                    _logger.LogWarning($"Invalid file type: {file.ContentType}");
                    return BadRequest(new { success = false, error = $"Loại file không hỗ trợ: {file.ContentType}" });
                }

                // Kiểm tra kích thước file
                if (file.Length > 5 * 1024 * 1024)
                {
                    _logger.LogWarning($"File too large: {file.Length} bytes");
                    return BadRequest(new { success = false, error = "Kích thước file quá lớn (tối đa 5MB)" });
                }

                // Kiểm tra và tạo thư mục lưu trữ
                var uploadsFolder = "uploads";
                var backgroundsFolder = "backgrounds";
                var webRootPath = _environment.WebRootPath;
                _logger.LogInformation($"WebRootPath: {webRootPath}");

                var uploadsPath = Path.Combine(webRootPath, uploadsFolder);
                if (!Directory.Exists(uploadsPath))
                {
                    _logger.LogInformation($"Creating directory: {uploadsPath}");
                    Directory.CreateDirectory(uploadsPath);
                }

                var backgroundsPath = Path.Combine(uploadsPath, backgroundsFolder);
                if (!Directory.Exists(backgroundsPath))
                {
                    _logger.LogInformation($"Creating directory: {backgroundsPath}");
                    Directory.CreateDirectory(backgroundsPath);
                }

                // Tạo tên file độc nhất
                var fileExtension = Path.GetExtension(file.FileName);
                var fileName = $"{currentUser.Id}_{otherUserId}_{Guid.NewGuid()}{fileExtension}";
                var filePath = Path.Combine(backgroundsPath, fileName);
                _logger.LogInformation($"Target file path: {filePath}");

                // Lưu file
                try
                {
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        _logger.LogInformation("Copying file to stream...");
                        await file.CopyToAsync(stream);
                        _logger.LogInformation("File saved successfully");
                    }
                }
                catch (Exception ioEx)
                {
                    _logger.LogError(ioEx, "Error saving file");
                    return StatusCode(500, new
                    {
                        success = false,
                        error = "Lỗi khi lưu file: " + ioEx.Message,
                        detail = $"IO Error: {ioEx.ToString()}"
                    });
                }

                // Đường dẫn file để lưu vào DB và trả về client
                var fileUrl = $"/{uploadsFolder}/{backgroundsFolder}/{fileName}";
                _logger.LogInformation($"File URL: {fileUrl}");

                try
                {
                    // Kiểm tra xem record đã tồn tại chưa
                    var chatSettings = await _context.ChatSettings
                        .FirstOrDefaultAsync(s => s.UserId == currentUser.Id && s.OtherUserId == otherUserId);

                    if (chatSettings == null)
                    {
                        // Lấy thông tin người nhận cho nickname
                        string otherUserName;

                        if (otherUser != null)
                        {
                            // Sử dụng GetDisplayName nếu có, nếu không thì dùng các thuộc tính khác
                            otherUserName = otherUser.GetDisplayName();
                        }
                        else
                        {
                            otherUserName = "Người dùng";
                        }

                        _logger.LogInformation($"Creating new ChatSettings with nickname: {otherUserName}");

                        // Tạo mới bản ghi với nickname mặc định
                        chatSettings = new ChatSettings
                        {
                            UserId = currentUser.Id,
                            OtherUserId = otherUserId,
                            BackgroundImage = fileUrl,
                            Nickname = otherUserName, // Đảm bảo có giá trị
                            Theme = "default",
                            LastUpdated = DateTime.Now
                        };

                        // Thêm vào DbContext
                        _context.ChatSettings.Add(chatSettings);
                    }
                    else
                    {
                        _logger.LogInformation($"Updating existing ChatSettings ID: {chatSettings.Id}");

                        // Cố gắng xóa file cũ
                        if (!string.IsNullOrEmpty(chatSettings.BackgroundImage) &&
                            chatSettings.BackgroundImage.StartsWith($"/{uploadsFolder}/{backgroundsFolder}/"))
                        {
                            try
                            {
                                var oldFilePath = Path.Combine(webRootPath, chatSettings.BackgroundImage.TrimStart('/'));
                                _logger.LogInformation($"Checking old file: {oldFilePath}");

                                if (System.IO.File.Exists(oldFilePath))
                                {
                                    _logger.LogInformation($"Deleting old file: {oldFilePath}");
                                    System.IO.File.Delete(oldFilePath);
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(ex, "Error deleting old file (continuing anyway)");
                            }
                        }

                        // Cập nhật bản ghi hiện tại
                        chatSettings.BackgroundImage = fileUrl;
                        chatSettings.LastUpdated = DateTime.Now;
                    }

                    // Lưu thay đổi vào database
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Database updated successfully");
                }
                catch (Exception dbEx)
                {
                    _logger.LogError(dbEx, "Database error");

                    // Quan trọng: Vẫn trả về thành công dù có lỗi DB vì file đã được lưu thành công
                    // Client có thể dùng hình nền mà không cần DB được cập nhật
                    return Json(new
                    {
                        success = true,
                        backgroundImage = fileUrl,
                        warning = "File đã được lưu nhưng cài đặt không được cập nhật trong cơ sở dữ liệu"
                    });
                }

                // Trả về kết quả thành công
                _logger.LogInformation("=== UploadChatBackground SUCCESS ===");
                return Json(new
                {
                    success = true,
                    backgroundImage = fileUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UploadChatBackground");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Lỗi không xác định: " + ex.Message,
                    detail = ex.ToString(),
                    stack = ex.StackTrace
                });
            }
        }
    }
}