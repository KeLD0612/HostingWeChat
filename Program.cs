using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using webchat.Data; // Import SeedData
using webchat.Hubs;
using webchat.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Cấu hình Entity Framework
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Cấu hình Identity với cải tiến
builder.Services.AddDefaultIdentity<ApplicationUser>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;

    options.User.AllowedUserNameCharacters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    options.User.RequireUniqueEmail = true;

    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<ApplicationDbContext>();

//// Thêm Google Authentication
//builder.Services.AddAuthentication()
//    .AddGoogle(googleOptions =>
//    {
//        googleOptions.ClientId = builder.Configuration["Authentication:Google:ClientId"];
//        googleOptions.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
//    });

// Thêm Google và Facebook Authentication
builder.Services.AddAuthentication()
    .AddGoogle(googleOptions =>
    {
        // Google OAuth
        googleOptions.ClientId = "849236488746-epb8evnt5pk21cipdnvd3u9giiloda2n.apps.googleusercontent.com";
        googleOptions.ClientSecret = "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";

        // Log để debug
        Console.WriteLine($"Google ClientId: {googleOptions.ClientId}");
        Console.WriteLine($"Google ClientSecret: {googleOptions.ClientSecret}");
    })
    .AddFacebook(facebookOptions =>
    {
        // Facebook OAuth
        facebookOptions.AppId = "1736399113916576";
        facebookOptions.AppSecret = "36560cfa2a08bde4fe1341e83601f569";
        facebookOptions.Scope.Add("email");
        facebookOptions.Scope.Add("public_profile");

        // Log để debug
        Console.WriteLine($"Facebook AppId: {facebookOptions.AppId}");
        Console.WriteLine($"Facebook AppSecret: {facebookOptions.AppSecret}");
    });

// Email sender service
builder.Services.AddTransient<IEmailSender, EmailSender>();

// Cookie configuration với cải tiến
builder.Services.ConfigureApplicationCookie(options =>
{
    options.LoginPath = "/Identity/Account/Login";
    options.LogoutPath = "/Identity/Account/Logout";
    options.AccessDeniedPath = "/Identity/Account/AccessDenied";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.ExpireTimeSpan = TimeSpan.FromMinutes(60);
    options.SlidingExpiration = true;

    // Cấu hình riêng cho Admin
    options.Events.OnRedirectToLogin = context =>
    {
        if (context.Request.Path.StartsWithSegments("/Admin"))
        {
            context.Response.Redirect("/Admin/Account/Login");
        }
        else
        {
            context.Response.Redirect("/Identity/Account/Login");
        }
        return Task.CompletedTask;
    };
});

// Thêm Razor Pages
builder.Services.AddRazorPages();

// SignalR cho chat system
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

// Session support cho admin
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// CORS cho API (nếu cần)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin",
        builder => builder
            .WithOrigins("https://localhost:7000", "http://localhost:5000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// Add logging
builder.Services.AddLogging();

var app = builder.Build();

// Database initialization và seeding
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        // Gọi SeedData để tạo admin user
        await SeedData.Initialize(services);

        logger.LogInformation("🎯 Admin setup completed successfully");
        Console.WriteLine("=".PadRight(50, '='));
        Console.WriteLine("🎯 ADMIN ACCOUNT READY!");
        Console.WriteLine("📧 Email: admin@dating.com");
        Console.WriteLine("🔐 Password: Admin@123");
        Console.WriteLine("🌐 Admin URL: https://localhost:7215/Admin");
        Console.WriteLine("🌐 User Login: https://localhost:7215/Identity/Account/Login");
        Console.WriteLine("=".PadRight(50, '='));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ An error occurred during admin setup");
    }
}

// Configure pipeline
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();

// STATIC FILES VỚI DISABLE CACHE CHO DEVELOPMENT
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (app.Environment.IsDevelopment())
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            ctx.Context.Response.Headers.Append("Pragma", "no-cache");
            ctx.Context.Response.Headers.Append("Expires", "0");
        }
    }
});

// Session middleware
app.UseSession();

app.UseRouting();

// CORS (nếu cần)
app.UseCors("AllowSpecificOrigin");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// ============= THÊM MIDDLEWARE BAN CHECK =============
app.UseMiddleware<webchat.Middleware.UserBanCheckMiddleware>();

// Map Razor Pages
app.MapRazorPages();

// ĐỊNH TUYẾN CHO ADMIN AREA - QUAN TRỌNG
app.MapControllerRoute(
    name: "admin_default",
    pattern: "Admin/{controller=Dashboard}/{action=Index}/{id?}",
    defaults: new { area = "Admin" });

app.MapControllerRoute(
    name: "admin_account",
    pattern: "Admin/Account/{action=Login}",
    defaults: new { area = "Admin", controller = "Account" });

// API routes cho AJAX calls
app.MapControllerRoute(
    name: "admin_api",
    pattern: "Admin/Api/{controller}/{action}/{id?}",
    defaults: new { area = "Admin" });

// Areas routing
app.MapControllerRoute(
    name: "areas",
    pattern: "{area:exists}/{controller=Home}/{action=Index}/{id?}");

// DATING APP ROUTES - Định tuyến cho ứng dụng hẹn hò
// Registration route - SỬA LẠI
app.MapControllerRoute(
    name: "complete_registration",
    pattern: "CompleteRegistration/{action=Index}",
    defaults: new { controller = "CompleteRegistration" });

// Alias cho Register đơn giản
app.MapControllerRoute(
    name: "dating_register",
    pattern: "Register",
    defaults: new { controller = "CompleteRegistration", action = "Index" });

// Explore routes for dating app
app.MapControllerRoute(
    name: "explore",
    pattern: "Explore/{action=Index}",
    defaults: new { controller = "Explore" });

// Dating API routes for AJAX calls
app.MapControllerRoute(
    name: "dating_api",
    pattern: "Api/Dating/{controller}/{action}",
    defaults: new { area = "" });

// Likes routes
app.MapControllerRoute( 
    name: "likes",
    pattern: "Likes/{action=Index}",
    defaults: new { controller = "Likes" });

// Matches routes  
app.MapControllerRoute(
    name: "matches",
    pattern: "Matches/{action=Index}",
    defaults: new { controller = "Matches" });

// Dating profile routes
app.MapControllerRoute(
    name: "dating_profile",
    pattern: "DatingProfile/{action=Index}",
    defaults: new { controller = "DatingProfile" });

// Notification routes
app.MapControllerRoute(
    name: "notification",
    pattern: "Notification/{action=Index}",
    defaults: new { controller = "Notification" });

// Chat routes
app.MapControllerRoute(
    name: "chat",
    pattern: "Chat/{action=Index}/{id?}",
    defaults: new { controller = "Chat" });

// User profile routes
app.MapControllerRoute(
    name: "profile",
    pattern: "Profile/{action=Index}/{id?}",
    defaults: new { controller = "Profile" });

// Default routing - ĐẶT CUỐI CÙNG
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// SignalR Hub
app.MapHub<ChatHub>("/chatHub");

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new
{
    Status = "Healthy",
    Timestamp = DateTime.Now,
    Environment = app.Environment.EnvironmentName,
    AdminUrl = "https://localhost:7215/Admin",
    UserLoginUrl = "https://localhost:7215/Identity/Account/Login"
}));

app.Run();

// Enhanced EmailSender với better logging
public class EmailSender : IEmailSender
{
    private readonly ILogger<EmailSender> _logger;
    private readonly IWebHostEnvironment _environment;

    public EmailSender(ILogger<EmailSender> logger, IWebHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public Task SendEmailAsync(string email, string subject, string htmlMessage)
    {
        if (_environment.IsDevelopment())
        {
            // Development - chỉ log
            _logger.LogInformation("📧 [DEV] Email would be sent to: {Email}", email);
            _logger.LogInformation("📧 [DEV] Subject: {Subject}", subject);
            _logger.LogDebug("📧 [DEV] Content: {Content}", htmlMessage);

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"📧 Email sent to: {email} - Subject: {subject}");
            Console.ResetColor();
        }
        else
        {
            // Production - implement actual email service
            _logger.LogInformation("📧 [PROD] Sending email to: {Email}", email);
            // TODO: Implement actual email service (SendGrid, SMTP, etc.)
        }

        return Task.CompletedTask;
    }
}