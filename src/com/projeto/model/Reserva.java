/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.projeto.model;

/**
 *
 * @author juuli
 */
public class Reserva {

    private String id;
    private String dataReserva;
    private String horaInicio;
    private String horaFim;
    private String idSala; 
    private String identificacaoCadastro;

    private Sala Sala;

    public Reserva() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDataReserva() {
        return dataReserva;
    }

    public void setDataReserva(String dataReserva) {
        this.dataReserva = dataReserva;
    }

    public String getHoraInicio() {
        return horaInicio;
    }

    public void setHoraInicio(String horaInicio) {
        this.horaInicio = horaInicio;
    }

    public String getHoraFim() {
        return horaFim;
    }

    public void setHoraFim(String horaFim) {
        this.horaFim = horaFim;
    }

    public String getIdSala() {
        return idSala;
    }

    public void setIdSala(String idSala) {
        this.idSala = idSala;
    }

    public String getIdentificacaoCadastro() {
        return identificacaoCadastro;
    }

    public void setIdentificacaoCadastro(String identificacaoCadastro) {
        this.identificacaoCadastro = identificacaoCadastro;
    }
}
