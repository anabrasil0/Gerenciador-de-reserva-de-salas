/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.projeto.service;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
/**
 *
 * @author juuli
 */
public class ConexaoSQLite {
// Método para abrir a conexão com o arquivo do banco
    public static Connection conectar() {
        try {
            // Isso vai criar um arquivo chamado "bancoreservas.db" na pasta do seu projeto
            String url = "jdbc:sqlite:bancoreservas_v2.db";
            return DriverManager.getConnection(url);
        } catch (Exception e) {
            System.out.println("Erro na conexão com o banco: " + e.getMessage());
            return null;
        }
    }

    // Método para criar as tabelas caso elas ainda não existam
    public static void criarTabelas() {
        String sqlSala = "CREATE TABLE IF NOT EXISTS sala (" +
                         "id TEXT PRIMARY KEY, " +
                         "nome TEXT, " +
                         "localizacao TEXT, " +
                         "tipo TEXT, " +
                         "possuiComputadores BOOLEAN" +
                         ");";

        String sqlReserva = "CREATE TABLE IF NOT EXISTS reserva (" +
                            "id TEXT PRIMARY KEY, " +
                            "dataReserva TEXT, " +
                            "horaInicio TEXT, " +
                            "horaFim TEXT, " +
                            "idSala TEXT, " +
                            "identificacaoCadastro TEXT" +
                            ");";

        // NOVO: Comando SQL para criar a tabela de Cadastro
        String sqlCadastro = "CREATE TABLE IF NOT EXISTS cadastro (" +
                             "id TEXT PRIMARY KEY, " +
                             "nome TEXT, " +
                             "email TEXT, " +
                             "telefone TEXT" +
                             ");";

        try (Connection conn = conectar(); Statement stmt = conn.createStatement()) {
            stmt.execute(sqlSala);
            stmt.execute(sqlReserva);
            stmt.execute(sqlCadastro); // Executando a criação da nova tabela
            System.out.println("Banco de dados pronto para uso!");
        } catch (Exception e) {
            System.out.println("Erro ao criar as tabelas: " + e.getMessage());
        }
    }
}