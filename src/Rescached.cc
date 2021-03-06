/*
 * Copyright 2009-2017 Mhd Sulhan (ms@kilabit.info)
 */

#include "Rescached.hh"

namespace rescached {

ClientWorker		CW;
Resolver		_WorkerTCP;
ResolverWorkerUDP	*_WorkerUDP;

const char* Rescached::__cname = "Rescached";

Rescached::Rescached() :
	_fdata()
,	_flog()
,	_fpid()
,	_dns_parent()
,	_dns_conn()
,	_hosts_d()
,	_listen_addr()
,	_listen_port(RESCACHED_DEF_PORT)
,	_srvr_tcp()
,	_fd_all()
,	_fd_read()
,	_show_timestamp(RESCACHED_DEF_LOG_SHOW_TS)
,	_show_appstamp(RESCACHED_DEF_LOG_SHOW_STAMP)
{}

Rescached::~Rescached()
{
}

/**
 * @method	: Rescached::init()
 * @param	:
 *	> fconf : config file to read.
 * @return	:
 *	< 0	: success.
 *	< -1	: fail.
 * @desc	: initialize Rescached object.
 */
int Rescached::init(const char* fconf)
{
	int s = load_config(fconf);
	if (s != 0) {
		return -1;
	}

	// Open log file with maximum size to 2MB
	Error err = dlog.open(_flog.v(), 2048000
		, _show_appstamp ? RESCACHED_DEF_STAMP : ""
		, _show_timestamp);
	if (err != NULL) {
		return -1;
	}

	err = File::WRITE_PID (_fpid.chars());
	if (err != NULL) {
		dlog.er("%s: PID file exist"
			", rescached process may already running.\n"
			, __cname);
		return -1;
	}

	s = _nc.bucket_init ();
	if (s != 0) {
		return -1;
	}

	s = load_hosts(RESCACHED_SYS_HOSTS, vos::DNS_IS_LOCAL);
	if (s < 0) {
		return -1;
	}

	if (_hosts_d.len() > 0) {
		load_hosts_d();
	}

	load_cache();

	s = bind();

	return s;
}

//
// `config_parse_server_listen()` will get "server.listen" from user
// configuration and parse their value to get listen address and port.
//
// (1) If no port is set, then default port will be used.
//
int Rescached::config_parse_server_listen(Config* cfg)
{
	long int li_port = 0;
	List* addr_port = NULL;
	Buffer* addr = NULL;
	Buffer* port = NULL;

	const char* v = cfg->get(RESCACHED_CONF_HEAD, "server.listen"
				, RESCACHED_DEF_LISTEN);
	Error err = _listen_addr.copy_raw(v);
	if (err != NULL) {
		return -1;
	}

	addr_port = SPLIT_BY_CHAR(&_listen_addr, ':', 1);

	// (1)
	if (addr_port->size() == 1) {
		_listen_port = RESCACHED_DEF_PORT;
		goto out;
	}

	addr = (Buffer*) addr_port->at(0);
	port = (Buffer*) addr_port->at(1);

	_listen_addr.copy(addr);
	err = port->to_lint(&li_port);
	if (err != NULL || li_port <= 0 || li_port > 65535) {
		_listen_port = RESCACHED_DEF_PORT;
	} else {
		_listen_port = (uint16_t) li_port;
	}

out:
	if (addr_port) {
		delete addr_port;
	}

	return 0;
}

/**
 * @method	: Rescached::load_config
 * @param	:
 *	> fconf : config file to read.
 * @return	:
 *	< 0	: success.
 *	< -1	: fail.
 * @desc	: get user configuration from file.
 */
int Rescached::load_config(const char* fconf)
{
	int		s	= 0;
	Config		cfg;
	const char*	v	= NULL;

	_running = 1;

	if (!fconf) {
		fconf = RESCACHED_CONF;
	}

	dlog.out("%s: loading config '%s'\n", __cname, fconf);

	Error err = cfg.load(fconf);
	if (err != NULL) {
		dlog.er("%s: cannot open config file '%s'!", __cname, fconf);
		return -1;
	}

	v = cfg.get(RESCACHED_CONF_HEAD, "file.data", RESCACHED_DATA);
	err = _fdata.copy_raw(v);
	if (err != NULL) {
		return -1;
	}

	v = cfg.get(RESCACHED_CONF_HEAD, "file.log", RESCACHED_LOG);
	err = _flog.copy_raw(v);
	if (err != NULL) {
		return -1;
	}

	v = cfg.get(RESCACHED_CONF_HEAD, "file.pid", RESCACHED_PID);
	err = _fpid.copy_raw(v);
	if (err != NULL) {
		return -1;
	}

	v = cfg.get(RESCACHED_CONF_HEAD, "server.parent"
			, RESCACHED_DEF_PARENT);
	err = _dns_parent.copy_raw(v);
	if (err != NULL) {
		return -1;
	}

	v = cfg.get (RESCACHED_CONF_HEAD, "server.parent.connection"
			, RESCACHED_DEF_PARENT_CONN);
	err = _dns_conn.copy_raw (v);
	if (err != NULL) {
		return -1;
	}

	if (_dns_conn.like_raw ("tcp") == 0) {
		_dns_conn_t = vos::IS_TCP;
	}

	s = config_parse_server_listen(&cfg);
	if (s != 0) {
		return -1;
	}

	_rto = (uint8_t) cfg.get_number(RESCACHED_CONF_HEAD, "server.timeout"
					, RESCACHED_DEF_TIMEOUT);
	if (_rto <= 0) {
		_rto = RESCACHED_DEF_TIMEOUT;
	}

	_nc._cache_max = cfg.get_number(RESCACHED_CONF_HEAD, "cache.max"
					, RESCACHED_CACHE_MAX);
	if (_nc._cache_max <= 0) {
		_nc._cache_max = RESCACHED_CACHE_MAX;
	}

	_nc._cache_thr = cfg.get_number(RESCACHED_CONF_HEAD, "cache.threshold"
					, RESCACHED_DEF_THRESHOLD);
	if (_nc._cache_thr <= 0) {
		_nc._cache_thr = RESCACHED_DEF_THRESHOLD;
	}

	_cache_minttl = (uint32_t) cfg.get_number(RESCACHED_CONF_HEAD
		, "cache.minttl", RESCACHED_DEF_MINTTL);
	if (_cache_minttl <= 0) {
		_cache_minttl = RESCACHED_DEF_MINTTL;
	}

	v = cfg.get(RESCACHED_CONF_HEAD, "hosts_d.path", HOSTS_D);
	_hosts_d.copy_raw(v);

	_dbg = (int) cfg.get_number(RESCACHED_CONF_HEAD, "debug"
					, RESCACHED_DEF_DEBUG);
	if (_dbg < 0) {
		_dbg = RESCACHED_DEF_DEBUG;
	}

	_show_timestamp = (int) cfg.get_number(RESCACHED_CONF_LOG
						, "show_timestamp"
						, RESCACHED_DEF_LOG_SHOW_TS);

	_show_appstamp = (int) cfg.get_number(RESCACHED_CONF_LOG
					, "show_appstamp"
					, RESCACHED_DEF_LOG_SHOW_STAMP);

	/* environment variable replace value in config file */
	v	= getenv("RESCACHED_DEBUG");
	_dbg	= (!v) ? _dbg : atoi(v);

	if (DBG_LVL_IS_1) {
		dlog.er("%s: cache file        : %s\n", __cname, _fdata.v());
		dlog.er("%s: pid file          : %s\n", __cname, _fpid.v());
		dlog.er("%s: log file          : %s\n", __cname, _flog.v());
		dlog.er("%s: parent address    : %s\n", __cname, _dns_parent.v());
		dlog.er("%s: parent connection : %s\n", __cname, _dns_conn.v());
		dlog.er("%s: listening on      : %s:%d\n", __cname
			, _listen_addr.v(), _listen_port);
		dlog.er("%s: timeout           : %d seconds\n", __cname, _rto);
		dlog.er("%s: cache maximum     : %ld\n", __cname, _nc._cache_max);
		dlog.er("%s: cache threshold   : %ld\n", __cname, _nc._cache_thr);
		dlog.er("%s: cache min TTL     : %d\n", __cname, _cache_minttl);
		dlog.er("%s: debug level       : %d\n", __cname, _dbg);
		dlog.er("%s: show timestamp    : %d\n", __cname, _show_timestamp);
		dlog.er("%s: show stamp        : %d\n", __cname, _show_appstamp);
	}

	return 0;
}

/**
 * @method	: Rescached::bind
 * @return	:
 *	< 0	: success.
 *	< -1	: fail.
 * @desc	: initialize Resolver object and start listening to client
 * connections.
 *
 * (1) Create and run resolver worker object based on `server.parent` and
 * `server.connection` values.
 *
 * (3) Create server for UDP.
 * (4) Create server for TCP.
 * (5) Initialize open fd.
 */
int Rescached::bind()
{
	if (!_running) {
		return 0;
	}

	int s;

	// (1)
	if (_dns_conn_t == vos::IS_UDP) {
		_WorkerUDP = ResolverWorkerUDP::INIT(&_dns_parent);
		if (!_WorkerUDP) {
			return -1;
		}
	} else {
		s = _WorkerTCP.add_server(_dns_parent.v());
		if (s) {
			return -1;
		}

		s = _WorkerTCP.init(SOCK_STREAM);
		if (s) {
			return -1;
		}
	}

	// (3)
	s = _srvr_udp.create_udp();
	if (s != 0) {
		return -1;
	}

	s = _srvr_udp.bind(_listen_addr.v(), _listen_port);
	if (s != 0) {
		return -1;
	}

	// (4)
	s = _srvr_tcp.create();
	if (s != 0) {
		return -1;
	}

	s = _srvr_tcp.bind_listen(_listen_addr.v(), _listen_port);
	if (s != 0) {
		return -1;
	}

	// (5)
	FD_ZERO(&_fd_all);
	FD_ZERO(&_fd_read);

	_srvr_udp.set_add(&_fd_all, NULL);
	_srvr_tcp.set_add(&_fd_all, NULL);

	dlog.out("%s: listening on %s:%d.\n", __cname, _listen_addr.v()
		, _listen_port);

	return 0;
}

/**
 * @method	: Rescached::load_hosts
 * @desc	: load host-ip address in hosts file.
 * @return 1	: unsupported, can not find hosts file in the system.
 * @return 0	: success.
 * @return -1	: fail to open and/or parse hosts file.
 */
int Rescached::load_hosts(const char* fhosts, const uint32_t attrs)
{
	int	s	= 0;
	int	addr	= 0;
	int	cnt	= 0;

	if (!fhosts) {
		return -1;
	}

	dlog.out("%s: loading host file '%s'\n", __cname, fhosts);

	SSVReader	reader;
	DNSQuery	qanswer;
	Buffer*		ip = NULL;
	List*		row = NULL;
	Buffer*		c = NULL;
	int x, y;

	reader._comment_c = '#';

	Error err = reader.load(fhosts);
	if (err != NULL) {
		return -1;
	}

	for (x = 0; x < reader._rows->size() && _running; x++) {
		row = (List*) reader._rows->at(x);
		ip = (Buffer*) row->at(0);

		int is_ipv4 = inet_pton (AF_INET, ip->chars(), &addr);
		addr	= 0;

		if (is_ipv4 != 1) {
			continue;
		}

		for (y = 1; y < row->size(); y++) {
			c = (Buffer*) row->at(y);

			s = qanswer.create_answer (c->chars()
				, (uint16_t) vos::QUERY_T_ADDRESS
				, (uint16_t) vos::QUERY_C_IN
				, RESCACHED_DEF_MAXTTL
				, (uint16_t) ip->len()
				, ip->chars()
				, attrs);

			if (s == 0) {
				_nc.insert_copy(&qanswer, 0, 1);
				cnt++;
			}
		}
	}

	dlog.out("%s: %d addresses loaded.\n", __cname, cnt);

	return 0;
}

void Rescached::load_host_files(const char* dir, DirNode* host_file)
{
	Buffer host_path;

	while (host_file) {
		host_path.reset();
		host_path.concat(dir, "/", host_file->_name.chars(), NULL);

		if (host_file->is_dir()) {
			load_host_files(host_path.chars(), host_file->_child);
			goto cont;
		}

		if (host_file->_name.like_raw(HOSTS_BLOCK) == 0) {
			// Load blocked hosts.
			load_hosts(host_path.chars()
					, vos::DNS_IS_BLOCKED);
		} else {
			load_hosts(host_path.chars()
					, vos::DNS_IS_LOCAL);
		}

cont:
		host_file = host_file->_next;
	}
}

void Rescached::load_hosts_d()
{
	Dir hosts_d;

	hosts_d.open(_hosts_d.v());

	load_host_files(_hosts_d.v(), hosts_d._ls->_child);

	hosts_d.close();
}

/**
 * `Rescached::load_cache()` will load cache data from file.
 */
void Rescached::load_cache()
{
	if (!_running) {
		return;
	}

	dlog.out("%s: loading cache '%s'...\n", __cname, _fdata.v());

	_nc.load(_fdata.v());

	dlog.out("%s: %d records loaded.\n", __cname, _nc._cachel.size());

	if (DBG_LVL_IS_3) {
		_nc.dump();
	}
}

/**
 * @method	: Rescached::run
 * @return	:
 *	< 0	: success.
 *	< -1	: fail.
 * @desc	: run Rescached service.
 */
int Rescached::run()
{
	int			s		= 0;
	struct timeval		timeout;
	DNSQuery*		question	= NULL;
	Socket*			client		= NULL;
	struct sockaddr_in*	addr		= NULL;

	while (_running) {
		_fd_read	= _fd_all;
		timeout.tv_sec	= _rto;
		timeout.tv_usec	= 0;

		s = select(FD_SETSIZE, &_fd_read, NULL, NULL, &timeout);
		if (s <= 0) {
			if (EINTR == errno) {
				s = 0;
				break;
			}
			continue;
		}

		if (_srvr_udp.is_readable(&_fd_read, NULL)) {
			if (DBG_LVL_IS_2) {
				dlog.out("%s: read server udp.\n", __cname);
			}

			addr = (struct sockaddr_in*) calloc(1
							, SockAddr::IN_SIZE);
			if (!addr) {
				dlog.er("%s: error at allocating new address!\n"
					, __cname);
				continue;
			}

			s = (int) _srvr_udp.recv_udp(addr);
			if (s <= 0) {
				dlog.er("%s: error at receiving UDP packet!\n"
					, __cname);
				free(addr);
				addr = NULL;
				continue;
			}

			s = DNSQuery::INIT(&question, &_srvr_udp);
			if (s < 0) {
				dlog.er("%s: error at initializing dnsquery!\n"
					, __cname);
				free(addr);
				addr = NULL;
				continue;
			}

			s = queue_push(addr, NULL, &question);
			if (s != 0) {
				dlog.er("%s: error at processing client!\n"
					, __cname);
				delete question;
				question = NULL;
			}
			if (addr) {
				free (addr);
				addr = NULL;
			}
		} else if (_srvr_tcp.is_readable(&_fd_read, NULL)) {
			if (DBG_LVL_IS_2) {
				dlog.out("%s: read server tcp.\n", __cname);
			}

			Error err = _srvr_tcp.accept_conn(&client);
			if (err != NULL) {
				dlog.er("%s: error at accepting client TCP connection!\n"
					, __cname);
				continue;
			}

			client->set_add(&_fd_all, NULL);

			s = process_tcp_client();
		} else {
			if (_srvr_tcp._clients) {
				s = process_tcp_client();
			}
		}
	}

	if (DBG_LVL_IS_1) {
		dlog.er("%s: service stopped ...\n", __cname);
	}

	return s;
}

int Rescached::process_tcp_client()
{
	int		x		= 0;
	Socket*		client		= NULL;
	DNSQuery*	question	= NULL;
	ssize_t s = 0;
	Error err;

	if (!_srvr_tcp._clients) {
		return 0;
	}

	for (; x < _srvr_tcp._clients->size(); x++) {
		client = (Socket*) _srvr_tcp._clients->at(x);

		if (! client->is_readable(&_fd_read, NULL)) {
			continue;
		}

		client->reset();
		err = client->read();

		if (err != NULL) {
			/* client read error or close connection */
			client->set_clear(&_fd_all);
			_srvr_tcp.remove_client(client);
			delete client;
		} else {
			s = DNSQuery::INIT(&question, client
						, vos::BUFFER_IS_TCP);
			if (s < 0) {
				continue;
			}

			queue_push(NULL, client, &question);

			question = NULL;
		}
	}

	return 0;
}

/**
 * @method		: Rescached::queue_push
 * @param		:
 *	> udp_client	: address of client, if send from UDP.
 *	> tcp_client	: pointer to client Socket object, if query is send
 *                        from TCP.
 *	> question	: pointer to DNS packet question.
 * @return		:
 *	< 0		: success.
 *	< -1		: fail.
 * @desc		: add client question to queue.
 */
int Rescached::queue_push(struct sockaddr_in* udp_client, Socket* tcp_client
			, DNSQuery** question)
{
	ResQueue* obj = new ResQueue();
	if (!obj) {
		return -1;
	}

	if (udp_client) {
		obj->_udp_client = (struct sockaddr_in *) calloc (1
						, SockAddr::IN_SIZE);
		memcpy (obj->_udp_client, udp_client, SockAddr::IN_SIZE);
	}

	obj->_tcp_client	= tcp_client;
	obj->_qstn		= (*question);

	CW.push_question(obj);

	return 0;
}

/**
 * @method	: Rescached::exit
 * @desc	: release Rescache object.
 */
void Rescached::exit()
{
	_running = 0;

	if (_WorkerUDP) {
		_WorkerUDP->stop();
		_WorkerUDP->join();

		delete _WorkerUDP;
		_WorkerUDP = NULL;
	}

	if (!_fdata.is_empty()) {
		_nc.save(_fdata.v());
	}

	if (!_fpid.is_empty()) {
		unlink(_fpid.v());
	}
}

} /* namespace::rescached */
// vi: ts=8 sw=8 tw=78:
