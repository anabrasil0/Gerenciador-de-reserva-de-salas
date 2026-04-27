package com.projeto.api;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.projeto.model.Sala;
import com.projeto.model.Reserva;
import com.projeto.service.SalaService;
import com.projeto.service.ReservaService;
import com.projeto.service.ConexaoSQLite;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.Headers;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class ApiServer {

    private static Gson gson = new Gson();
    private static SalaService salaService = new SalaService();
    private static ReservaService reservaService = new ReservaService();

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

        // Configuração endpoints
        server.createContext("/api/rooms", new RoomsHandler());
        server.createContext("/api/reservations", new ReservationsHandler());
        server.createContext("/", new StaticFileHandler());

        server.setExecutor(null);
        server.start();
        System.out.println("=== SERVIDOR INICIADO ===");
        System.out.println("Acesse: http://localhost:8080/index.html");
        System.out.println("Pressione Ctrl+C para parar");
    }

    //HANDLER PARA SALAS
    static class RoomsHandler implements HttpHandler {

        @Override
        public void handle(com.sun.net.httpserver.HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String response = "";
            int statusCode = 200;

            // Configuração CORS
            Headers headers = exchange.getResponseHeaders();
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            headers.set("Access-Control-Allow-Headers", "Content-Type");
            headers.set("Content-Type", "application/json");

            if (method.equals("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                return;  // ← CORREÇÃO 1: adicionado return
            }

            try {
                if (method.equals("GET")) {
                    response = getAllRoomsJSON();
                } else if (method.equals("POST")) {
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
                        String body = reader.lines().collect(Collectors.joining("\n"));

                        Sala novaSala = gson.fromJson(body, Sala.class);
                        salaService.cadastrarSala(novaSala);

                        JsonObject json = new JsonObject();
                        json.addProperty("success", true);
                        json.addProperty("message", "Sala cadastrada com sucesso");
                        response = gson.toJson(json);
                    }
            } catch (Exception e) {
                statusCode = 500;
                JsonObject error = new JsonObject();
                error.addProperty("error", e.getMessage());
                response = gson.toJson(error);
            }

            exchange.sendResponseHeaders(statusCode, response.getBytes().length);
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }

        // CORREÇÃO 2: Método movido para dentro da classe RoomsHandler
        private String getAllRoomsJSON() {
            List<Map<String, Object>> rooms = new ArrayList<>();
            String sql = "SELECT * FROM sala";

            try (Connection conn = ConexaoSQLite.conectar(); PreparedStatement stmt = conn.prepareStatement(sql); ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {
                    Map<String, Object> room = new HashMap<>();
                    room.put("id", rs.getString("id"));
                    room.put("nome", rs.getString("nome"));
                    room.put("localizacao", rs.getString("localizacao"));
                    room.put("tipo", rs.getString("tipo"));
                    room.put("possuiComputadores", rs.getBoolean("possuiComputadores"));
                    rooms.add(room);
                }
            } catch (Exception e) {
                System.out.println("Erro ao buscar salas: " + e.getMessage());
            }
            return gson.toJson(rooms);
        }
    }

    // ==================== HANDLER PARA RESERVAS ====================
    static class ReservationsHandler implements HttpHandler {

        @Override
        public void handle(com.sun.net.httpserver.HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();
            String response = "";
            int statusCode = 200;

            Headers headers = exchange.getResponseHeaders();
            headers.set("Access-Control-Allow-Origin", "*");
            headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
            headers.set("Access-Control-Allow-Headers", "Content-Type");
            headers.set("Content-Type", "application/json");

            if (method.equals("OPTIONS")) {
                exchange.sendResponseHeaders(204, -1);
                return;  // ← CORREÇÃO 3: adicionado return
            }

            try {
                if (method.equals("GET")) {
                    if (path.contains("/user/")) {
                        String email = path.substring(path.lastIndexOf("/") + 1);
                        response = getReservationsByUser(email);
                    } else {
                        response = getAllReservationsJSON();
                    }
                } else if (method.equals("POST")) {
                    String body = new BufferedReader(
                            new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))
                            .lines()
                            .collect(Collectors.joining("\n"));

                    Reserva novaReserva = gson.fromJson(body, Reserva.class);

                    if (novaReserva.getId() == null || novaReserva.getId().isEmpty()) {
                        novaReserva.setId("RES" + System.currentTimeMillis());
                    }

                    reservaService.cadastrarReserva(novaReserva);

                    JsonObject json = new JsonObject();
                    json.addProperty("success", true);
                    json.addProperty("message", "Reserva feita com sucesso");
                    response = gson.toJson(json);
                } else if (method.equals("DELETE")) {
                    String id = path.substring(path.lastIndexOf("/") + 1);
                    reservaService.cancelarReserva(id);

                    JsonObject json = new JsonObject();
                    json.addProperty("success", true);
                    json.addProperty("message", "Reserva cancelada");
                    response = gson.toJson(json);
                }
            } catch (Exception e) {
                statusCode = 500;
                JsonObject error = new JsonObject();
                error.addProperty("error", e.getMessage());
                response = gson.toJson(error);
            }

            exchange.sendResponseHeaders(statusCode, response.getBytes().length);
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }

        private String getAllReservationsJSON() {
            List<Map<String, Object>> reservas = new ArrayList<>();
            String sql = "SELECT * FROM reserva";

            try (Connection conn = ConexaoSQLite.conentar(); PreparedStatement stmt = conn.prepareStatement(sql); ResultSet rs = stmt.executeQuery()) {

                while (rs.next()) {
                    Map<String, Object> reserva = new HashMap<>();
                    reserva.put("id", rs.getString("id"));
                    reserva.put("dataReserva", rs.getString("dataReserva"));
                    reserva.put("horaInicio", rs.getString("horaInicio"));
                    reserva.put("horaFim", rs.getString("horaFim"));
                    reserva.put("idSala", rs.getString("idSala"));
                    reserva.put("identificacaoCadastro", rs.getString("identificacaoCadastro"));
                    reservas.add(reserva);
                }
            } catch (Exception e) {
                System.out.println("Erro: " + e.getMessage());
            }
            return gson.toJson(reservas);
        }

        private String getReservationsByUser(String email) {
            List<Map<String, Object>> reservas = new ArrayList<>();
            String sql = "SELECT * FROM reserva WHERE identificacaoCadastro = ?";

            try (Connection conn = ConexaoSQLite.conectar(); PreparedStatement stmt = conn.prepareStatement(sql)) {

                stmt.setString(1, email);
                ResultSet rs = stmt.executeQuery();

                while (rs.next()) {
                    Map<String, Object> reserva = new HashMap<>();
                    reserva.put("id", rs.getString("id"));
                    reserva.put("dataReserva", rs.getString("dataReserva"));
                    reserva.put("horaInicio", rs.getString("horaInicio"));
                    reserva.put("horaFim", rs.getString("horaFim"));
                    reserva.put("idSala", rs.getString("idSala"));
                    reserva.put("identificacaoCadastro", rs.getString("identificacaoCadastro"));
                    reservas.add(reserva);
                }
            } catch (Exception e) {
                System.out.println("Erro: " + e.getMessage());
            }
            return gson.toJson(reservas);
        }
    }

    // ==================== HANDLER PARA ARQUIVOS ESTÁTICOS ====================
    // CORREÇÃO 4: StaticFileHandler movido para fora, no nível correto
    static class StaticFileHandler implements HttpHandler {

        @Override
        public void handle(com.sun.net.httpserver.HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/index.html";
            }

            File file = new File("webapp" + path);

            if (file.exists() && !file.isDirectory()) {
                String contentType = getContentType(path);
                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.sendResponseHeaders(200, file.length());

                try (FileInputStream fis = new FileInputStream(file); OutputStream os = exchange.getResponseBody()) {
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    while ((bytesRead = fis.read(buffer)) != -1) {
                        os.write(buffer, 0, bytesRead);
                    }
                }
            } else {
                String response = "Arquivo não encontrado: " + path;
                exchange.sendResponseHeaders(404, response.length());
                exchange.getResponseBody().write(response.getBytes());
            }
            exchange.close();
        }

        private String getContentType(String path) {
            if (path.endsWith(".html")) {
                return "text/html";
            }
            if (path.endsWith(".css")) {
                return "text/css";
            }
            if (path.endsWith(".js")) {
                return "application/javascript";
            }
            return "text/plain";
        }
    }
}
