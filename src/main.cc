//
// Copyright 2009-2016 M. Shulhan (ms@kilabit.info). All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//

#include "main.hh"

using namespace rescached;

volatile sig_atomic_t	_SIG_lock_	= 0;
static int		_got_signal_	= 0;
static Rescached	R;

static void rescached_interrupted(int sig_num)
{
	switch (sig_num) {
	case SIGUSR1:
		/* send interrupt to select() */
		break;
	case SIGSEGV:
		if (_SIG_lock_) {
			::raise(sig_num);
		}
		_SIG_lock_	= 1;
		_got_signal_	= sig_num;
		R.exit();
		_SIG_lock_	= 0;

		::signal(sig_num, SIG_DFL);
		break;
	case SIGTERM:
	case SIGINT:
	case SIGQUIT:
		if (_SIG_lock_) {
			::raise(sig_num);
		}
		_SIG_lock_	= 1;
		_got_signal_ 	= sig_num;
		_running	= 0;
		CW.wakeup();
		_SIG_lock_	= 0;
                break;
        }
}

static void rescached_set_signal_handle()
{
	struct sigaction sig_new;

	memset(&sig_new, 0, sizeof(struct sigaction));
	sig_new.sa_handler = rescached_interrupted;
	sigemptyset(&sig_new.sa_mask);
	sig_new.sa_flags = 0;

	sigaction(SIGINT, &sig_new, 0);
	sigaction(SIGQUIT, &sig_new, 0);
	sigaction(SIGTERM, &sig_new, 0);
	sigaction(SIGSEGV, &sig_new, 0);
	sigaction(SIGUSR1, &sig_new, 0);
}

int main(int argc, char *argv[])
{
	int s = -1;

	rescached_set_signal_handle();

	if (argc == 1) {
		s = R.init(NULL);
	} else if (argc == 2) {
		s = R.init(argv[1]);
	} else {
		dlog.er("\n Usage: rescached <rescached-config>\n ");
	}
	if (s != 0) {
		goto err;
	}

	_skip_log = 0;

	CW.start();
	R.run();
err:
	if (s) {
		perror(NULL);
	}
	R.exit();
	CW.stop();
	CW.join();

	return s;
}
// vi: ts=8 sw=8 tw=78:
