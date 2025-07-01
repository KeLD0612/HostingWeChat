# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# Copy and restore dependencies
COPY . ./
RUN dotnet restore

# Publish
RUN dotnet publish -c Release -o /out

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /out ./

# Expose port
EXPOSE 8080

# Run the app
ENTRYPOINT ["dotnet", "webchat.dll"]
